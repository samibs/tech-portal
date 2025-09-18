import { Router } from 'express';
import * as portManager from '../services/port-manager';
import { portMonitor } from '../services/port-monitor';
import { requireAuth } from '../middleware/auth';
import logger from '../logger';

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
    const success = await portManager.killProcess(pid);
    if (success) {
      res.json({ success: true, message: `Process ${pid} killed` });
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
    const success = await portManager.killProcessByPort(port);
    if (success) {
      res.json({ success: true, message: `Process on port ${port} killed` });
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
      monitoredPorts: portMonitor.getMonitoredPorts(),
      knownProcesses,
    });
  } catch (error) {
    logger.error('Error getting monitoring status:', error);
    res.status(500).json({ error: 'Failed to get monitoring status' });
  }
});

export default router;
