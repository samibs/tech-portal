import fetch from "node-fetch";
import net from "net";
import { storage } from "../storage";
import { 
  ReplitApp, 
  AppStatus, 
  Endpoint, 
  EndpointStatus,
  AppPort,
  AppProcess
} from "@shared/schema";

let monitorInterval: NodeJS.Timeout | null = null;
let endpointMonitorInterval: NodeJS.Timeout | null = null;
let portMonitorInterval: NodeJS.Timeout | null = null;
let processMonitorInterval: NodeJS.Timeout | null = null;
let isMonitoring = false;

// No forward declarations needed anymore

// Start the monitoring service
export async function startMonitoring(): Promise<void> {
  if (isMonitoring) return;
  
  const settings = await storage.getSettings();
  const checkFrequencyMs = settings.checkFrequency * 1000;
  const endpointCheckFrequencyMs = settings.endpointCheckFrequency * 1000;
  const portCheckFrequencyMs = settings.portCheckFrequency * 1000;
  const processCheckFrequencyMs = settings.processCheckFrequency * 1000;
  
  console.log(`Starting monitor service with check frequency: ${settings.checkFrequency}s`);
  console.log(`  - Endpoint checks: ${settings.endpointCheckFrequency}s`);
  console.log(`  - Port checks: ${settings.portCheckFrequency}s`);
  console.log(`  - Process checks: ${settings.processCheckFrequency}s`);
  
  isMonitoring = true;
  monitorInterval = setInterval(checkAllApps, checkFrequencyMs);
  endpointMonitorInterval = setInterval(checkAllEndpoints, endpointCheckFrequencyMs);
  portMonitorInterval = setInterval(checkAllPorts, portCheckFrequencyMs);
  
  // Enable process monitoring if ghost process detection is enabled
  if (settings.enableGhostProcessDetection) {
    processMonitorInterval = setInterval(checkAllProcesses, processCheckFrequencyMs);
  }
  
  // Run initial checks immediately
  checkAllApps();
  checkAllEndpoints();
  checkAllPorts();
  if (settings.enableGhostProcessDetection) {
    checkAllProcesses();
  }
}

// Stop the monitoring service
export async function stopMonitoring(): Promise<void> {
  if (!isMonitoring) return;
  
  // Clear all intervals
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  
  if (endpointMonitorInterval) {
    clearInterval(endpointMonitorInterval);
    endpointMonitorInterval = null;
  }
  
  if (portMonitorInterval) {
    clearInterval(portMonitorInterval);
    portMonitorInterval = null;
  }
  
  if (processMonitorInterval) {
    clearInterval(processMonitorInterval);
    processMonitorInterval = null;
  }
  
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
import { restartApp, terminateGhostProcesses } from "./controller";

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
          (updatedApp.status === "Stopped" || updatedApp.status === "Unreachable" || 
           updatedApp.status === "Error")) {
        
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
              status: "Running"
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
  let newStatus: string;
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
    newStatus = "Error";
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
async function checkHttpStatus(app: ReplitApp): Promise<string> {
  try {
    // Format URL (if it doesn't include http:// or https://)
    let url = app.appUrl;
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
        return "Running";
      } else {
        return "Unreachable";
      }
    } catch (error) {
      clearTimeout(timeout);
      
      // Check if it's a timeout error
      if ((error as Error).name === 'AbortError') {
        return "Unreachable";
      }
      
      // Other fetch errors
      return "Stopped";
    }
  } catch (error) {
    console.error(`HTTP check error for app ${app.id}:`, error);
    return "Error";
  }
}

// Check port status
async function checkPortStatus(app: ReplitApp): Promise<string> {
  return new Promise((resolve) => {
    // Extract domain from URL
    let domain = app.appUrl;
    
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
      resolve("Running");
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve("Unreachable");
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve("Stopped");
    });
    
    // Attempt to connect
    socket.connect(app.port, domain);
  });
}

// ENDPOINT MONITORING

// Check all endpoints
async function checkAllEndpoints(): Promise<void> {
  try {
    const endpoints = await storage.getEndpoints();
    const settings = await storage.getSettings();
    
    for (const endpoint of endpoints) {
      // Skip endpoints for apps that are not running
      const app = await storage.getApp(endpoint.appId);
      if (!app || app.status !== "Running") continue;
      
      await checkEndpointStatus(endpoint, app);
    }
  } catch (error) {
    console.error("Error checking endpoints:", error);
  }
}

// Check status of a single endpoint
async function checkEndpointStatus(endpoint: Endpoint, app: ReplitApp): Promise<void> {
  const previousStatus = endpoint.status;
  let newStatus: EndpointStatus;
  let details = "";
  
  try {
    // Check endpoint status
    newStatus = await checkEndpointAvailability(endpoint, app);
    
    // Update last checked time and status
    await storage.updateEndpoint(endpoint.id, { 
      lastChecked: new Date(),
      status: newStatus
    });
    
    // Log status change if needed
    if (previousStatus !== newStatus) {
      details = `Endpoint ${endpoint.method} ${endpoint.path} status changed from ${previousStatus} to ${newStatus}`;
      await storage.createLog({
        appId: endpoint.appId,
        action: "Endpoint Status Change",
        details,
        status: null
      });
      
      console.log(`Endpoint ${endpoint.id} (${endpoint.method} ${endpoint.path}): ${details}`);
    }
  } catch (error) {
    console.error(`Error checking endpoint ${endpoint.id} (${endpoint.method} ${endpoint.path}):`, error);
    
    // Set error status and log it
    newStatus = EndpointStatus.UNKNOWN;
    details = `Error checking endpoint status: ${(error as Error).message}`;
    
    await storage.updateEndpoint(endpoint.id, { 
      lastChecked: new Date(),
      status: newStatus
    });
    
    await storage.createLog({
      appId: endpoint.appId,
      action: "Endpoint Check Error",
      details,
      status: null
    });
  }
}

// Check endpoint availability
async function checkEndpointAvailability(endpoint: Endpoint, app: ReplitApp): Promise<EndpointStatus> {
  try {
    // Format base URL
    let baseUrl = app.appUrl;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Add port if it's not a standard port
    if (app.port !== 80 && app.port !== 443 && !baseUrl.includes(':')) {
      const urlObj = new URL(baseUrl);
      urlObj.port = app.port.toString();
      baseUrl = urlObj.toString();
    }
    
    // Build full URL
    const url = new URL(endpoint.path, baseUrl).toString();
    
    // Get settings for timeout
    const settings = await storage.getSettings();
    
    // Perform the HTTP request with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.endpointTimeout);
    
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: endpoint.method,
        signal: controller.signal
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      clearTimeout(timeout);
      
      // Update response time metrics
      await storage.updateEndpoint(endpoint.id, {
        responseTime: responseTime
      });
      
      // Check response status
      if (response.ok) {
        return EndpointStatus.UP;
      } else if (response.status >= 500) {
        return EndpointStatus.DOWN;
      } else {
        return EndpointStatus.DEGRADED;
      }
    } catch (error) {
      clearTimeout(timeout);
      
      // Check if it's a timeout error
      if ((error as Error).name === 'AbortError') {
        return EndpointStatus.DEGRADED;
      }
      
      // Other fetch errors
      return EndpointStatus.DOWN;
    }
  } catch (error) {
    console.error(`Endpoint check error for ${endpoint.method} ${endpoint.path}:`, error);
    return EndpointStatus.UNKNOWN;
  }
}

// PORT MONITORING

// Check all ports
async function checkAllPorts(): Promise<void> {
  try {
    const ports = await storage.getPorts();
    
    for (const port of ports) {
      // Skip ports for apps that are not running
      const app = await storage.getApp(port.appId);
      if (!app || app.status !== "Running") continue;
      
      await checkPortAvailability(port, app);
    }
  } catch (error) {
    console.error("Error checking ports:", error);
  }
}

// Check availability of a single port
async function checkPortAvailability(port: AppPort, app: ReplitApp): Promise<void> {
  const previousStatus = port.status;
  let newStatus: string;
  let details = "";
  
  try {
    // Check port availability
    newStatus = await checkSpecificPortStatus(port.port, app.appUrl);
    
    // Update last checked time and status
    await storage.updatePort(port.id, { 
      lastChecked: new Date(),
      status: newStatus
    });
    
    // Log status change if needed
    if (previousStatus !== newStatus) {
      details = `Port ${port.port} (${port.service}) status changed from ${previousStatus} to ${newStatus}`;
      await storage.createLog({
        appId: port.appId,
        action: "Port Status Change",
        details,
        status: null
      });
      
      console.log(`Port ${port.id} (${port.port}): ${details}`);
    }
  } catch (error) {
    console.error(`Error checking port ${port.id} (${port.port}):`, error);
    
    // Set error status and log it
    newStatus = "Error";
    details = `Error checking port status: ${(error as Error).message}`;
    
    await storage.updatePort(port.id, { 
      lastChecked: new Date(),
      status: newStatus
    });
    
    await storage.createLog({
      appId: port.appId,
      action: "Port Check Error",
      details,
      status: null
    });
  }
}

// Check specific port status
async function checkSpecificPortStatus(portNumber: number, hostUrl: string): Promise<string> {
  return new Promise((resolve) => {
    // Extract domain from URL
    let domain = hostUrl;
    
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
      resolve("In use");
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve("Timeout");
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      // Check error type
      if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        resolve("Available"); // Port is open but no service listening
      } else {
        resolve("Unreachable"); // Other error
      }
    });
    
    // Attempt to connect
    socket.connect(portNumber, domain);
  });
}

// PROCESS MONITORING

// Check all processes
async function checkAllProcesses(): Promise<void> {
  try {
    const settings = await storage.getSettings();
    
    // Skip if ghost process detection is disabled
    if (!settings.enableGhostProcessDetection) return;
    
    const apps = await storage.getApps();
    
    for (const app of apps) {
      // Skip apps that don't have ghost process detection enabled
      if (!app.checkForGhostProcesses) continue;
      
      await checkAppProcesses(app);
      
      // Auto-cleanup if enabled and app has ghost processes
      if (settings.cleanupGhostProcesses) {
        try {
          // Get ghost processes count
          const processes = await storage.getProcesses(app.id);
          const ghostProcessCount = processes.filter(p => 
            app.status !== "Running" && 
            p.status === "Running"
          ).length;
          
          // Terminate ghost processes if any found
          if (ghostProcessCount > 0) {
            console.log(`Auto-cleanup: Found ${ghostProcessCount} ghost processes for app ${app.id} (${app.name})`);
            const result = await terminateGhostProcesses(app);
            
            console.log(`Auto-cleanup result for app ${app.id} (${app.name}): ${result.success ? 'Success' : 'Failed'}, ${result.terminatedCount} processes terminated${result.error ? '. Error: ' + result.error : ''}`);
          }
        } catch (error) {
          console.error(`Error during auto-cleanup of ghost processes for app ${app.id} (${app.name}):`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error checking processes:", error);
  }
}

// Check processes for a single app
async function checkAppProcesses(app: ReplitApp): Promise<void> {
  try {
    const processes = await storage.getProcesses(app.id);
    
    for (const process of processes) {
      // Skip processes that are already terminated
      if (process.status === "Terminated") continue;
      
      await checkProcessStatus(process, app);
    }
  } catch (error) {
    console.error(`Error checking processes for app ${app.id}:`, error);
  }
}

// Check status of a single process
async function checkProcessStatus(process: AppProcess, app: ReplitApp): Promise<void> {
  const previousStatus = process.status;
  let newStatus: string;
  let details = "";
  
  try {
    // In a real implementation, we would check the actual process
    // For simulation, we'll check if the app is running
    newStatus = app.status === "Running" ? "Running" : "Terminated";
    
    // Update last checked time and status if changed
    if (previousStatus !== newStatus) {
      await storage.updateProcess(process.id, { 
        lastChecked: new Date(),
        status: newStatus
      });
      
      details = `Process PID ${process.pid} (${process.command}) status changed from ${previousStatus} to ${newStatus}`;
      await storage.createLog({
        appId: process.appId,
        action: "Process Status Change",
        details,
        status: null
      });
      
      console.log(`Process ${process.id} (PID ${process.pid}): ${details}`);
    }
  } catch (error) {
    console.error(`Error checking process ${process.id} (PID ${process.pid}):`, error);
    
    // Log the error
    details = `Error checking process status: ${(error as Error).message}`;
    await storage.createLog({
      appId: process.appId,
      action: "Process Check Error",
      details,
      status: null
    });
  }
}
