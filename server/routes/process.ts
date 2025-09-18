import { Router } from 'express';
import * as portManager from '../services/port-manager';
import { portMonitor } from '../services/port-monitor';
import { requireAuth } from '../middleware/auth';
import logger from '../logger';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Find a process by port
router.get('/ports/:port/process', async (req, res) => {
  try {
    const port = parseInt(req.params.port, 10);
    if (isNaN(port)) {
      return res.status(400).json({ error: 'Invalid port number' });
    }
    const processInfo = await portManager.findProcessByPort(port);
    if (processInfo) {
      res.json(processInfo);
    } else {
      res.status(404).json({ message: 'No process found on this port' });
    }
  } catch (error) {
    logger.error('Error finding process by port:', error);
    res.status(500).json({ error: 'Failed to find process by port' });
  }
});

// Kill a process by PID
router.delete('/processes/:pid', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid, 10);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'Invalid PID' });
    }

    const processInfo = await portManager.findProcessByPid(pid);
    if (!processInfo) {
      return res.status(404).json({ error: 'Process not found' });
    }

    const success = await portManager.killProcess(pid);
    if (success) {
      res.json({ success: true, message: `Process ${processInfo.name} (PID: ${pid}) killed`, killedProcess: processInfo });
    } else {
      res.status(500).json({ error: 'Failed to kill process' });
    }
  } catch (error) {
    logger.error('Error killing process:', error);
    res.status(500).json({ error: 'Failed to kill process' });
  }
});

// Kill a process by port
router.delete('/ports/:port/process', async (req, res) => {
  try {
    const port = parseInt(req.params.port, 10);
    if (isNaN(port)) {
      return res.status(400).json({ error: 'Invalid port number' });
    }
    const killedProcess = await portManager.killProcessByPort(port);
    if (killedProcess) {
      res.json({ success: true, message: `Process ${killedProcess.name} (PID: ${killedProcess.pid}) on port ${port} killed`, killedProcess });
    } else {
      res.status(404).json({ error: 'No process found to kill on this port' });
    }
  } catch (error) {
    logger.error('Error killing process by port:', error);
    res.status(500).json({ error: 'Failed to kill process by port' });
  }
});

// Start monitoring
router.post('/monitoring/start', (req, res) => {
  try {
    portMonitor.start();
    res.json({ success: true, message: 'Port monitoring started' });
  } catch (error) {
    logger.error('Error starting monitoring:', error);
    res.status(500).json({ error: 'Failed to start monitoring' });
  }
});

// Stop monitoring
router.post('/monitoring/stop', (req, res) => {
  try {
    portMonitor.stop();
    res.json({ success: true, message: 'Port monitoring stopped' });
  } catch (error) {
    logger.error('Error stopping monitoring:', error);
    res.status(500).json({ error: 'Failed to stop monitoring' });
  }
});

// Get monitoring status
router.get('/monitoring/status', (req, res) => {
  try {
    const knownProcesses = Object.fromEntries(portMonitor.getKnownProcesses());
    res.json({
      isMonitoring: !!portMonitor['monitoringInterval'],
      monitoredPorts: portMonitor.getPorts(),
      knownProcesses,
    });
  } catch (error) {
    logger.error('Error getting monitoring status:', error);
    res.status(500).json({ error: 'Failed to get monitoring status' });
  }
});

// Get monitored ports
router.get('/monitoring/ports', (req, res) => {
  try {
    const ports = portMonitor.getPorts();
    res.json({ ports });
  } catch (error) {
    logger.error('Error getting monitored ports:', error);
    res.status(500).json({ error: 'Failed to get monitored ports' });
  }
});

// Add a port to monitor
router.post('/monitoring/ports', async (req, res) => {
    try {
        const { port } = req.body;
        if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
            return res.status(400).json({ error: 'Invalid port number' });
        }
        await portMonitor.addPort(port);
        res.json({ success: true, message: `Port ${port} added to monitoring list` });
    } catch (error) {
        logger.error('Error adding port to monitoring:', error);
        res.status(500).json({ error: 'Failed to add port to monitoring' });
    }
});

// Remove a port from monitoring
router.delete('/monitoring/ports/:port', async (req, res) => {
    try {
        const port = parseInt(req.params.port, 10);
        if (isNaN(port)) {
            return res.status(400).json({ error: 'Invalid port number' });
        }
        await portMonitor.removePort(port);
        res.json({ success: true, message: `Port ${port} removed from monitoring list` });
    } catch (error) {
        logger.error('Error removing port from monitoring:', error);
        res.status(500).json({ error: 'Failed to remove port from monitoring' });
    }
});

// Get port monitoring events
router.get('/monitoring/events', async (req, res) => {
    try {
        const PORT_EVENTS_FILE = path.join(__dirname, '../../data/port-events.json');
        const data = await fs.readFile(PORT_EVENTS_FILE, 'utf-8');
        const events = JSON.parse(data);
        res.json(events);
    } catch (error) {
        logger.error('Error getting port monitoring events:', error);
        res.status(500).json({ error: 'Failed to get port monitoring events' });
    }
});

export default router;
