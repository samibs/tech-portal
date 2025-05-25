import { Router } from 'express';
import { processMonitor, ProcessInfo, PortInfo } from '../services/process-monitor';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all running processes
router.get('/processes', async (req, res) => {
  try {
    const processes = await processMonitor.scanProcesses();
    res.json(processes);
  } catch (error) {
    console.error('Error getting processes:', error);
    res.status(500).json({ error: 'Failed to get processes' });
  }
});

// Get all port information
router.get('/ports', async (req, res) => {
  try {
    const ports = await processMonitor.scanPorts();
    res.json(ports);
  } catch (error) {
    console.error('Error getting ports:', error);
    res.status(500).json({ error: 'Failed to get ports' });
  }
});

// Get port usage summary
router.get('/ports/usage', async (req, res) => {
  try {
    const usage = await processMonitor.getPortUsage();
    res.json(usage);
  } catch (error) {
    console.error('Error getting port usage:', error);
    res.status(500).json({ error: 'Failed to get port usage' });
  }
});

// Find available port
router.get('/ports/available', async (req, res) => {
  try {
    const startPort = parseInt(req.query.start as string) || 3000;
    const availablePort = await processMonitor.findAvailablePort(startPort);
    res.json({ port: availablePort });
  } catch (error) {
    console.error('Error finding available port:', error);
    res.status(500).json({ error: 'Failed to find available port' });
  }
});

// Detect ghost processes
router.get('/processes/ghosts', async (req, res) => {
  try {
    const ghostProcesses = await processMonitor.detectGhostProcesses();
    res.json(ghostProcesses);
  } catch (error) {
    console.error('Error detecting ghost processes:', error);
    res.status(500).json({ error: 'Failed to detect ghost processes' });
  }
});

// Kill a process by PID
router.delete('/processes/:pid', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid);
    const signal = req.body.signal || 'SIGTERM';
    
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'Invalid PID' });
    }

    const success = await processMonitor.killProcess(pid, signal);
    
    if (success) {
      res.json({ success: true, message: `Process ${pid} killed with signal ${signal}` });
    } else {
      res.status(500).json({ error: 'Failed to kill process' });
    }
  } catch (error) {
    console.error('Error killing process:', error);
    res.status(500).json({ error: 'Failed to kill process' });
  }
});

// Kill processes on a specific port
router.delete('/ports/:port/processes', async (req, res) => {
  try {
    const port = parseInt(req.params.port);
    
    if (isNaN(port) || port < 1 || port > 65535) {
      return res.status(400).json({ error: 'Invalid port number' });
    }

    const success = await processMonitor.killProcessOnPort(port);
    
    if (success) {
      res.json({ success: true, message: `Processes on port ${port} killed` });
    } else {
      res.status(500).json({ error: 'Failed to kill processes on port' });
    }
  } catch (error) {
    console.error('Error killing processes on port:', error);
    res.status(500).json({ error: 'Failed to kill processes on port' });
  }
});

// Start monitoring
router.post('/monitoring/start', async (req, res) => {
  try {
    await processMonitor.startMonitoring();
    res.json({ success: true, message: 'Process monitoring started' });
  } catch (error) {
    console.error('Error starting monitoring:', error);
    res.status(500).json({ error: 'Failed to start monitoring' });
  }
});

// Stop monitoring
router.post('/monitoring/stop', async (req, res) => {
  try {
    processMonitor.stopMonitoring();
    res.json({ success: true, message: 'Process monitoring stopped' });
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    res.status(500).json({ error: 'Failed to stop monitoring' });
  }
});

// Get monitoring status
router.get('/monitoring/status', (req, res) => {
  try {
    const knownProcesses = processMonitor.getKnownProcesses();
    const knownPorts = processMonitor.getKnownPorts();
    
    res.json({
      isMonitoring: true, // Simplified for now
      processCount: knownProcesses.length,
      portCount: knownPorts.length,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    res.status(500).json({ error: 'Failed to get monitoring status' });
  }
});

// Get system resource usage
router.get('/system/resources', async (req, res) => {
  try {
    const processes = processMonitor.getKnownProcesses();
    
    // Calculate total resource usage
    const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
    const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);
    const processCount = processes.length;
    const portCount = processMonitor.getKnownPorts().length;
    
    // Get top resource consumers
    const topCpuProcesses = processes
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 5);
    
    const topMemoryProcesses = processes
      .sort((a, b) => b.memory - a.memory)
      .slice(0, 5);

    res.json({
      summary: {
        totalCpu,
        totalMemory,
        processCount,
        portCount
      },
      topConsumers: {
        cpu: topCpuProcesses,
        memory: topMemoryProcesses
      }
    });
  } catch (error) {
    console.error('Error getting system resources:', error);
    res.status(500).json({ error: 'Failed to get system resources' });
  }
});

export default router;
