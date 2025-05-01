import fetch from "node-fetch";
import net from "net";
import { storage } from "../storage";
import { ReplitApp, AppStatus } from "@shared/schema";

let monitorInterval: NodeJS.Timeout | null = null;
let isMonitoring = false;

// Start the monitoring service
export async function startMonitoring(): Promise<void> {
  if (isMonitoring) return;
  
  const settings = await storage.getSettings();
  const checkFrequencyMs = settings.checkFrequency * 1000;
  
  console.log(`Starting monitor service with check frequency: ${settings.checkFrequency}s`);
  
  isMonitoring = true;
  monitorInterval = setInterval(checkAllApps, checkFrequencyMs);
  
  // Run an initial check immediately
  checkAllApps();
}

// Stop the monitoring service
export async function stopMonitoring(): Promise<void> {
  if (!isMonitoring || !monitorInterval) return;
  
  clearInterval(monitorInterval);
  monitorInterval = null;
  isMonitoring = false;
  
  console.log('Monitoring service stopped');
}

// Update check frequency
export async function updateCheckFrequency(seconds: number): Promise<void> {
  // Restart monitoring with new frequency
  await stopMonitoring();
  
  const settings = await storage.getSettings();
  settings.checkFrequency = seconds;
  await storage.updateSettings({ checkFrequency: seconds });
  
  await startMonitoring();
  
  console.log(`Check frequency updated to ${seconds}s`);
}

// Import the controller functions
import { restartApp } from "./controller";

// Check all registered apps
async function checkAllApps(): Promise<void> {
  try {
    const apps = await storage.getApps();
    const settings = await storage.getSettings();
    
    for (const app of apps) {
      await checkAppStatus(app);
      
      // Refresh app data after status check
      const updatedApp = await storage.getApp(app.id);
      if (!updatedApp) continue; // Skip if app was deleted
      
      // Handle auto-restart if enabled
      if (settings.autoRestart && 
          (updatedApp.status === AppStatus.STOPPED || updatedApp.status === AppStatus.UNREACHABLE || 
           updatedApp.status === AppStatus.ERROR)) {
        
        // Attempt to restart the app
        console.log(`Auto-restart attempt for app ${updatedApp.id}: ${updatedApp.name}`);
        
        // Log the auto-restart attempt
        await storage.createLog({
          appId: updatedApp.id,
          action: "Auto-restart Attempt",
          details: `Auto-restart triggered for app in ${updatedApp.status} state`,
          status: updatedApp.status
        });
        
        // Actually try to restart the app using the controller
        try {
          const result = await restartApp(updatedApp);
          
          if (result.success) {
            console.log(`Auto-restart successful for app ${updatedApp.id}: ${updatedApp.name}`);
            
            await storage.createLog({
              appId: updatedApp.id,
              action: "Auto-restart Success",
              details: `Auto-restart completed successfully`,
              status: AppStatus.RUNNING
            });
          } else {
            console.error(`Auto-restart failed for app ${updatedApp.id}: ${result.error}`);
            
            await storage.createLog({
              appId: updatedApp.id,
              action: "Auto-restart Failed",
              details: `Auto-restart failed: ${result.error}`,
              status: updatedApp.status
            });
          }
        } catch (error) {
          console.error(`Error during auto-restart for app ${updatedApp.id}:`, error);
          
          await storage.createLog({
            appId: updatedApp.id,
            action: "Auto-restart Error",
            details: `Auto-restart error: ${(error as Error).message}`,
            status: updatedApp.status
          });
        }
      }
    }
  } catch (error) {
    console.error("Error checking apps:", error);
  }
}

// Check status of a single app
async function checkAppStatus(app: ReplitApp): Promise<void> {
  const previousStatus = app.status;
  let newStatus: AppStatus;
  let details = "";
  
  try {
    // Different check based on app type
    if (app.type === 'Frontend' || app.type === 'Backend') {
      // HTTP check
      newStatus = await checkHttpStatus(app);
    } else {
      // Port check for database, etc.
      newStatus = await checkPortStatus(app);
    }
    
    // Update last checked time and status
    await storage.updateApp(app.id, { 
      lastChecked: new Date(),
      status: newStatus
    });
    
    // Log status change if needed
    if (previousStatus !== newStatus) {
      details = `Status changed from ${previousStatus} to ${newStatus}`;
      await storage.createLog({
        appId: app.id,
        action: "Status Change",
        details,
        status: newStatus
      });
      
      console.log(`App ${app.id} (${app.name}): ${details}`);
    }
  } catch (error) {
    console.error(`Error checking app ${app.id} (${app.name}):`, error);
    
    // Set error status and log it
    newStatus = AppStatus.ERROR;
    details = `Error checking status: ${(error as Error).message}`;
    
    await storage.updateApp(app.id, { 
      lastChecked: new Date(),
      status: newStatus
    });
    
    await storage.createLog({
      appId: app.id,
      action: "Status Check Error",
      details,
      status: newStatus
    });
  }
}

// Check HTTP status
async function checkHttpStatus(app: ReplitApp): Promise<AppStatus> {
  try {
    // Format URL (if it doesn't include http:// or https://)
    let url = app.replitUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // Add port if it's not a standard port
    if (app.port !== 80 && app.port !== 443 && !url.includes(':')) {
      const urlObj = new URL(url);
      urlObj.port = app.port.toString();
      url = urlObj.toString();
    }
    
    // Perform the HTTP request with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      // Check response status
      if (response.ok) {
        return AppStatus.RUNNING;
      } else {
        return AppStatus.UNREACHABLE;
      }
    } catch (error) {
      clearTimeout(timeout);
      
      // Check if it's a timeout error
      if ((error as Error).name === 'AbortError') {
        return AppStatus.UNREACHABLE;
      }
      
      // Other fetch errors
      return AppStatus.STOPPED;
    }
  } catch (error) {
    console.error(`HTTP check error for app ${app.id}:`, error);
    return AppStatus.ERROR;
  }
}

// Check port status
async function checkPortStatus(app: ReplitApp): Promise<AppStatus> {
  return new Promise((resolve) => {
    // Extract domain from URL
    let domain = app.replitUrl;
    
    // Remove protocol if present
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      domain = domain.split('//')[1];
    }
    
    // Remove path if present
    domain = domain.split('/')[0];
    
    // Connect to the port
    const socket = new net.Socket();
    
    // Set timeout to 3 seconds
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(AppStatus.RUNNING);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(AppStatus.UNREACHABLE);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(AppStatus.STOPPED);
    });
    
    // Attempt to connect
    socket.connect(app.port, domain);
  });
}
