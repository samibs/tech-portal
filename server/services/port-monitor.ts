import { EventEmitter } from 'events';
import { findProcessByPort, ProcessInfo } from './port-manager.js';
import logger from '../logger.js';
import { broadcast } from '../websocket.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONITORED_PORTS_FILE = path.join(__dirname, '../../data/monitored-ports.json');
const PORT_EVENTS_FILE = path.join(__dirname, '../../data/port-events.json');

const DEFAULT_MONITOR_INTERVAL_MS = 5000; // 5 seconds

interface PortEvent {
  timestamp: string;
  type: 'process-detected' | 'process-gone';
  port: number;
  processInfo: ProcessInfo;
}

async function logPortEvent(event: Omit<PortEvent, 'timestamp'>) {
  try {
    let events: PortEvent[] = [];
    try {
      const data = await fs.readFile(PORT_EVENTS_FILE, 'utf-8');
      events = JSON.parse(data);
    } catch (error) {
      // File might not exist yet
    }
    events.unshift({ ...event, timestamp: new Date().toISOString() });
    // Keep only the last 100 events
    const truncatedEvents = events.slice(0, 100);
    await fs.writeFile(PORT_EVENTS_FILE, JSON.stringify(truncatedEvents, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error logging port event.', error);
  }
}

async function getMonitoredPortsFromFile(): Promise<number[]> {
  try {
    const data = await fs.readFile(MONITORED_PORTS_FILE, 'utf-8');
    const json = JSON.parse(data);
    return json.ports || [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist, create it with an empty array
      await writeMonitoredPortsToFile([]);
      return [];
    }
    logger.error('Error reading monitored ports file, returning empty array.', error);
    return [];
  }
}

async function writeMonitoredPortsToFile(ports: number[]): Promise<void> {
  try {
    await fs.writeFile(MONITORED_PORTS_FILE, JSON.stringify({ ports }, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error writing monitored ports file.', error);
  }
}

export class PortMonitor extends EventEmitter {
  private portsToMonitor: number[];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private knownProcesses: Map<number, ProcessInfo> = new Map(); // port -> ProcessInfo

  constructor(intervalMs: number = DEFAULT_MONITOR_INTERVAL_MS) {
    super();
    this.portsToMonitor = [];
    this.intervalMs = intervalMs;
  }

  private async loadPorts() {
    this.portsToMonitor = await getMonitoredPortsFromFile();
  }

  public async start(): Promise<void> {
    if (this.monitoringInterval) {
      logger.warn('Monitoring is already active.');
      return;
    }

    await this.loadPorts();
    logger.info(`Starting port monitoring for ports: [${this.portsToMonitor.join(', ')}]`);

    // Initial check
    this.checkPorts();

    this.monitoringInterval = setInterval(async () => {
      await this.loadPorts(); // Reload ports on each interval
      this.checkPorts();
    }, this.intervalMs);

    this.emit('monitoring-started');
  }

  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Port monitoring stopped.');
      this.emit('monitoring-stopped');
    }
  }

  public async addPort(port: number): Promise<void> {
    const ports = await getMonitoredPortsFromFile();
    if (!ports.includes(port)) {
      ports.push(port);
      await writeMonitoredPortsToFile(ports);
      this.portsToMonitor = ports;
      logger.info(`Added port ${port} to monitoring list.`);
    }
  }

  public async removePort(port: number): Promise<void> {
    let ports = await getMonitoredPortsFromFile();
    const index = ports.indexOf(port);
    if (index > -1) {
      ports.splice(index, 1);
      await writeMonitoredPortsToFile(ports);
      this.portsToMonitor = ports;
      logger.info(`Removed port ${port} from monitoring list.`);
    }
  }

  private async checkPorts(): Promise<void> {
    logger.info('Checking monitored ports for processes...');
    for (const port of this.portsToMonitor) {
      try {
        const processInfo = await findProcessByPort(port);
        const previouslyKnownProcess = this.knownProcesses.get(port);

        if (processInfo && processInfo.pid) {
          // Process found
          if (!previouslyKnownProcess || previouslyKnownProcess.pid !== processInfo.pid) {
            // New process detected
            this.knownProcesses.set(port, processInfo);
            const event = { type: 'process-detected' as const, port, processInfo };
            logger.info(`New process detected on port ${port}: ${processInfo.name} (PID: ${processInfo.pid})`);
            this.emit('process-detected', event);
            logPortEvent(event);
            broadcast(event);
          }
        } else if (previouslyKnownProcess) {
          // Process was there, but now it's gone
          const event = { type: 'process-gone' as const, port, processInfo: previouslyKnownProcess };
          logger.info(`Process on port ${port} (PID: ${previouslyKnownProcess.pid}) is no longer running.`);
          this.knownProcesses.delete(port);
          this.emit('process-gone', event);
          logPortEvent(event);
          broadcast(event);
        }
      } catch (error) {
        logger.error(`Error checking port ${port}:`, error);
      }
    }
  }

  public async getMonitoredPorts(): Promise<number[]> {
    return await getMonitoredPortsFromFile();
  }

  public getKnownProcesses(): Map<number, ProcessInfo> {
    return this.knownProcesses;
  }
}

// Export a singleton instance for convenience
export const portMonitor = new PortMonitor();
