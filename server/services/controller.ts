import { spawn, ChildProcess } from "child_process";
import { storage } from "../storage";
import { ReplitApp, AppStatus, AppProcess } from "@shared/schema";

interface AppControlResult {
  success: boolean;
  app?: ReplitApp;
  error?: string;
}

// Store running app processes
const runningProcesses: Map<number, ChildProcess> = new Map();

// Check for port conflicts with other running apps
async function checkPortConflicts(app: ReplitApp): Promise<{error: string} | null> {
  try {
    // Get all running apps
    const allApps = await storage.getApps();
    const runningApps = allApps.filter(a => 
      a.id !== app.id && 
      a.status === "Running"
    );
    
    // Check primary port conflict
    const primaryPortConflict = runningApps.find(a => a.port === app.port);
    if (primaryPortConflict) {
      return {
        error: `Port conflict: Port ${app.port} is already in use by app "${primaryPortConflict.name}" (ID: ${primaryPortConflict.id})`
      };
    }
    
    // Check additional ports if app has them
    if (app.additionalPorts && app.additionalPorts.length > 0) {
      const additionalPortsArray = app.additionalPorts.split(',').map(p => parseInt(p.trim()));
      for (const additionalPort of additionalPortsArray) {
        // Check conflict with any primary port
        const primaryConflict = runningApps.find(a => a.port === additionalPort);
        if (primaryConflict) {
          return {
            error: `Additional port conflict: Port ${additionalPort} is already in use as primary port by app "${primaryConflict.name}" (ID: ${primaryConflict.id})`
          };
        }
        
        // Check conflict with any additional port
        for (const runningApp of runningApps) {
          if (runningApp.additionalPorts && runningApp.additionalPorts.includes(additionalPort.toString())) {
            return {
              error: `Additional port conflict: Port ${additionalPort} is already in use as additional port by app "${runningApp.name}" (ID: ${runningApp.id})`
            };
          }
        }
      }
    }
    
    // Check against tracked ports in the database
    const allPorts = await storage.getPorts();
    const inUsePorts = allPorts.filter(p => 
      p.appId !== app.id && 
      p.status === "In use"
    );
    
    // Check primary port
    const portConflict = inUsePorts.find(p => p.port === app.port);
    if (portConflict) {
      const conflictApp = await storage.getApp(portConflict.appId);
      const appName = conflictApp ? conflictApp.name : `Unknown app (ID: ${portConflict.appId})`;
      return {
        error: `Port conflict: Port ${app.port} is already in use by ${appName} for ${portConflict.service}`
      };
    }
    
    // Check additional ports
    if (app.additionalPorts && app.additionalPorts.length > 0) {
      const additionalPortsArray = app.additionalPorts.split(',').map(p => parseInt(p.trim()));
      for (const additionalPort of additionalPortsArray) {
        const additionalPortConflict = inUsePorts.find(p => p.port === additionalPort);
        if (additionalPortConflict) {
          const conflictApp = await storage.getApp(additionalPortConflict.appId);
          const appName = conflictApp ? conflictApp.name : `Unknown app (ID: ${additionalPortConflict.appId})`;
          return {
            error: `Additional port conflict: Port ${additionalPort} is already in use by ${appName} for ${additionalPortConflict.service}`
          };
        }
      }
    }
    
    // No conflicts found
    return null;
  } catch (error) {
    console.error("Error checking port conflicts:", error);
    return {
      error: `Failed to check port conflicts: ${(error as Error).message}`
    };
  }
}

// Start an app
export async function startApp(app: ReplitApp): Promise<AppControlResult> {
  try {
    // Check if app is already running
    if (app.status === "Running") {
      return {
        success: false,
        error: `App ${app.name} is already running`
      };
    }
    
    // Check if there's already a process for this app
    if (runningProcesses.has(app.id)) {
      return {
        success: false,
        error: `Process for app ${app.name} already exists`
      };
    }

    // Log start attempt
    await storage.createLog({
      appId: app.id,
      action: "Start Attempt",
      details: `Attempting to start app with command: ${app.startCommand}`,
      status: app.status
    });
    
    // In a real implementation, this would use the Replit API to start the app
    // Since direct control is limited in Replit's environment, this is a simplified version
    
    // Documentation on limitations
    console.log(`NOTE: Limited control within Replit environment. In a real implementation, this would use Replit's API to start ${app.name}`);
    
    // Validate the startCommand and port before proceeding
    if (!app.startCommand || app.startCommand.trim() === '') {
      // Log failure
      await storage.createLog({
        appId: app.id,
        action: "Start Failed",
        details: `Failed to start app: Invalid start command`,
        status: app.status
      });
      
      return {
        success: false,
        error: `Invalid start command for ${app.name}`
      };
    }
    
    if (!app.port || app.port <= 0 || app.port > 65535) {
      // Log failure
      await storage.createLog({
        appId: app.id,
        action: "Start Failed",
        details: `Failed to start app: Invalid port number ${app.port}`,
        status: app.status
      });
      
      return {
        success: false,
        error: `Invalid port number ${app.port} for ${app.name}`
      };
    }
    
    // Check if appUrl is valid
    try {
      new URL(app.appUrl.startsWith("http") ? app.appUrl : `http://${app.appUrl}`);
    } catch (err) {
      // Log failure
      await storage.createLog({
        appId: app.id,
        action: "Start Failed",
        details: `Failed to start app: Invalid URL ${app.appUrl}`,
        status: app.status
      });
      
      return {
        success: false,
        error: `Invalid URL ${app.appUrl} for ${app.name}`
      };
    }
    
    // Check for port conflicts
    const portConflict = await checkPortConflicts(app);
    if (portConflict) {
      // Log failure
      await storage.createLog({
        appId: app.id,
        action: "Start Failed",
        details: `Failed to start app: ${portConflict.error}`,
        status: app.status
      });
      
      return {
        success: false,
        error: portConflict.error
      };
    }
    
    // Simulate trying to connect to the application
    const canConnect = await simulateConnectionCheck(app);
    if (!canConnect.success) {
      // Log the connection failure but still update status to show we "tried" to start it
      await storage.createLog({
        appId: app.id,
        action: "Started with Warning",
        details: `App ${app.name} started but might not be reachable: ${canConnect.error}`,
        status: "Running"
      });
    }
    
    // Simulate successful start and update status
    const updatedApp = await storage.updateApp(app.id, {
      status: "Running",
      lastChecked: new Date()
    });
    
    // Log successful start
    await storage.createLog({
      appId: app.id,
      action: "Started",
      details: `App ${app.name} started successfully (Note: This is a simulation)`,
      status: "Running"
    });
    
    return {
      success: true,
      app: updatedApp
    };
  } catch (error) {
    console.error(`Error starting app ${app.id}:`, error);
    
    // Log failure
    await storage.createLog({
      appId: app.id,
      action: "Start Failed",
      details: `Failed to start app: ${(error as Error).message}`,
      status: app.status
    });
    
    return {
      success: false,
      error: `Failed to start app: ${(error as Error).message}`
    };
  }
}

// Helper function to simulate checking if we can connect to the app
async function simulateConnectionCheck(app: ReplitApp): Promise<{success: boolean, error?: string}> {
  try {
    // This is a simulation, so we'll just return success based on a simple check
    if (app.appUrl.includes('localhost') || app.appUrl.includes('127.0.0.1')) {
      return {
        success: false,
        error: "Cannot connect to localhost from remote services"
      };
    }
    
    // Simulate a random success/failure to make it more realistic
    const randomSuccess = Math.random() > 0.2; // 80% success rate
    if (!randomSuccess) {
      return {
        success: false,
        error: "Simulated connection timeout"
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Connection check failed: ${(error as Error).message}`
    };
  }
}

// Stop an app
export async function stopApp(app: ReplitApp): Promise<AppControlResult> {
  try {
    // Check if app is already stopped
    if (app.status === "Stopped") {
      return {
        success: false,
        error: `App ${app.name} is already stopped`
      };
    }
    
    // Log stop attempt
    await storage.createLog({
      appId: app.id,
      action: "Stop Attempt",
      details: `Attempting to stop app ${app.name}`,
      status: app.status
    });
    
    // In a real implementation, this would use the Replit API to stop the app
    // Since direct control is limited in Replit's environment, this is a simplified version
    
    // Documentation on limitations
    console.log(`NOTE: Limited control within Replit environment. In a real implementation, this would use Replit's API to stop ${app.name}`);
    
    // Validate app details
    if (!app.name || app.name.trim() === '') {
      await storage.createLog({
        appId: app.id,
        action: "Stop Failed",
        details: `Failed to stop app: Invalid app name`,
        status: app.status
      });
      
      return {
        success: false,
        error: `Invalid app name for ID ${app.id}`
      };
    }
    
    // Remove from running processes if exists
    if (runningProcesses.has(app.id)) {
      runningProcesses.delete(app.id);
    }
    
    // Simulate a short pause for stopping
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate a random failure (10% chance)
    const randomSuccess = Math.random() > 0.1;
    if (!randomSuccess) {
      await storage.createLog({
        appId: app.id,
        action: "Stop Failed",
        details: `Failed to stop app: Connection refused`,
        status: app.status
      });
      
      return {
        success: false,
        error: `Failed to stop ${app.name}: Connection refused (simulated failure)`
      };
    }
    
    // Simulate successful stop and update status
    const updatedApp = await storage.updateApp(app.id, {
      status: "Stopped",
      lastChecked: new Date()
    });
    
    // Log successful stop
    await storage.createLog({
      appId: app.id,
      action: "Stopped",
      details: `App ${app.name} stopped successfully (Note: This is a simulation)`,
      status: "Stopped"
    });
    
    return {
      success: true,
      app: updatedApp
    };
  } catch (error) {
    console.error(`Error stopping app ${app.id}:`, error);
    
    // Log failure
    await storage.createLog({
      appId: app.id,
      action: "Stop Failed",
      details: `Failed to stop app: ${(error as Error).message}`,
      status: app.status
    });
    
    return {
      success: false,
      error: `Failed to stop app: ${(error as Error).message}`
    };
  }
}

// Terminate ghost processes for an app
export async function terminateGhostProcesses(app: ReplitApp): Promise<{ success: boolean, terminatedCount: number, error?: string }> {
  try {
    // Validate app
    if (!app.id) {
      return {
        success: false,
        terminatedCount: 0,
        error: "Invalid app ID"
      };
    }
    
    // Check if ghost process detection is enabled for this app
    if (!app.checkForGhostProcesses) {
      return {
        success: false,
        terminatedCount: 0,
        error: "Ghost process detection is not enabled for this app"
      };
    }
    
    // Log cleanup attempt
    await storage.createLog({
      appId: app.id,
      action: "Ghost Process Cleanup Attempt",
      details: `Attempting to clean up ghost processes for app ${app.name}`,
      status: app.status
    });
    
    // Get running processes for this app
    const processes = await storage.getProcesses(app.id);
    const ghostProcesses = processes.filter(p => 
      // Filter ghost processes (app is stopped but processes are running)
      app.status !== "Running" && 
      p.status === "Running"
    );
    
    if (ghostProcesses.length === 0) {
      await storage.createLog({
        appId: app.id,
        action: "Ghost Process Cleanup Complete",
        details: `No ghost processes found for app ${app.name}`,
        status: app.status
      });
      
      return {
        success: true,
        terminatedCount: 0
      };
    }
    
    // Simulate terminating the processes
    const terminatedIds: number[] = [];
    
    for (const process of ghostProcesses) {
      try {
        // In a real implementation, we'd use an API to kill the process
        // For simulation, just update the database
        await storage.updateProcess(process.id, {
          status: "Terminated",
          lastChecked: new Date()
        });
        
        await storage.createLog({
          appId: app.id,
          action: "Process Terminated",
          details: `Terminated ghost process PID ${process.pid} (${process.command})`,
          status: null
        });
        
        terminatedIds.push(process.id);
      } catch (error) {
        console.error(`Error terminating process ${process.id}:`, error);
        
        await storage.createLog({
          appId: app.id,
          action: "Process Termination Failed",
          details: `Failed to terminate process ${process.pid}: ${(error as Error).message}`,
          status: null
        });
      }
    }
    
    await storage.createLog({
      appId: app.id,
      action: "Ghost Process Cleanup Complete",
      details: `Terminated ${terminatedIds.length} of ${ghostProcesses.length} ghost processes for app ${app.name}`,
      status: app.status
    });
    
    return {
      success: true,
      terminatedCount: terminatedIds.length
    };
  } catch (error) {
    console.error(`Error terminating ghost processes for app ${app.id}:`, error);
    
    await storage.createLog({
      appId: app.id,
      action: "Ghost Process Cleanup Failed",
      details: `Error: ${(error as Error).message}`,
      status: app.status
    });
    
    return {
      success: false,
      terminatedCount: 0,
      error: `Failed to terminate ghost processes: ${(error as Error).message}`
    };
  }
}

// Restart an app
export async function restartApp(app: ReplitApp): Promise<AppControlResult> {
  try {
    // Validate app
    if (!app.name || app.name.trim() === '') {
      await storage.createLog({
        appId: app.id,
        action: "Restart Failed",
        details: `Failed to restart app: Invalid app name`,
        status: app.status
      });
      
      return {
        success: false,
        error: `Invalid app name for ID ${app.id}`
      };
    }
    
    // Log restart attempt
    await storage.createLog({
      appId: app.id,
      action: "Restart Attempt",
      details: `Attempting to restart app ${app.name}`,
      status: app.status
    });
    
    // Special case: if app is in ERROR or UNREACHABLE state, we should try to start it anyway
    if (app.status === "Error" || app.status === "Unreachable") {
      console.log(`App ${app.name} is in ${app.status} state, attempting direct start`);
      
      // Update status to STOPPED first
      const updatedApp = await storage.updateApp(app.id, {
        status: "Stopped",
        lastChecked: new Date()
      });
      
      // Start the app (making sure we don't pass undefined)
      if (!updatedApp) {
        return {
          success: false,
          error: `Failed to update app status to Stopped`
        };
      }
      const startResult = await startApp(updatedApp);
      if (!startResult.success) {
        return {
          success: false,
          error: `Failed to start app from ${app.status} state: ${startResult.error}`
        };
      }
      
      // Log successful restart from error state
      await storage.createLog({
        appId: app.id,
        action: "Restarted from Error",
        details: `App ${app.name} restarted successfully from ${app.status} state`,
        status: "Running"
      });
      
      return {
        success: true,
        app: startResult.app
      };
    }
    
    // Normal restart flow for RUNNING or STOPPED states
    // Stop the app first if it's running
    let currentApp = app;
    if (app.status === "Running") {
      const stopResult = await stopApp(app);
      if (!stopResult.success) {
        // Don't fail the whole restart if stop fails, log and continue
        await storage.createLog({
          appId: app.id,
          action: "Restart Warning",
          details: `Warning during restart: ${stopResult.error}. Continuing with start.`,
          status: app.status
        });
      } else {
        currentApp = stopResult.app!;
      }
    }
    
    // Wait a short time before starting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start the app
    const startResult = await startApp(currentApp);
    if (!startResult.success) {
      return {
        success: false,
        error: `Failed to start app during restart: ${startResult.error}`
      };
    }
    
    // Log successful restart
    await storage.createLog({
      appId: app.id,
      action: "Restarted",
      details: `App ${app.name} restarted successfully (Note: This is a simulation)`,
      status: "Running"
    });
    
    return {
      success: true,
      app: startResult.app
    };
  } catch (error) {
    console.error(`Error restarting app ${app.id}:`, error);
    
    // Log failure
    await storage.createLog({
      appId: app.id,
      action: "Restart Failed",
      details: `Failed to restart app: ${(error as Error).message}`,
      status: app.status
    });
    
    return {
      success: false,
      error: `Failed to restart app: ${(error as Error).message}`
    };
  }
}
