import { EventEmitter } from 'events';
import { findProcessByPort, ProcessInfo } from './port-manager';
import logger from '../logger';

// A list of ports to monitor by default. This can be changed.
const DEFAULT_PORTS_TO_MONITOR = [3000, 3001, 8000, 8080, 5000];
const DEFAULT_MONITOR_INTERVAL_MS = 5000; // 5 seconds

export class PortMonitor extends EventEmitter {
  private portsToMonitor: number[];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private knownProcesses: Map<number, ProcessInfo> = new Map(); // port -> ProcessInfo

  constructor(
    ports: number[] = DEFAULT_PORTS_TO_MONITOR,
    intervalMs: number = DEFAULT_MONITOR_INTERVAL_MS
  ) {
    super();
    this.portsToMonitor = ports;
    this.intervalMs = intervalMs;
  }

  public start(): void {
    if (this.monitoringInterval) {
      logger.warn('Monitoring is already active.');
      return;
    }

    logger.info(`Starting port monitoring for ports: [${this.portsToMonitor.join(', ')}]`);

    // Initial check
    this.checkPorts();

    this.monitoringInterval = setInterval(() => {
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
            logger.info(`New process detected on port ${port}: ${processInfo.name} (PID: ${processInfo.pid})`);
            this.emit('process-detected', { port, processInfo });
          }
        } else if (previouslyKnownProcess) {
          // Process was there, but now it's gone
          logger.info(`Process on port ${port} (PID: ${previouslyKnownProcess.pid}) is no longer running.`);
          this.knownProcesses.delete(port);
          this.emit('process-gone', { port, processInfo: previouslyKnownProcess });
        }
      } catch (error) {
        logger.error(`Error checking port ${port}:`, error);
      }
    }
  }

  public getMonitoredPorts(): number[] {
    return this.portsToMonitor;
  }

  public getKnownProcesses(): Map<number, ProcessInfo> {
    return this.knownProcesses;
  }
}

// Export a singleton instance for convenience
export const portMonitor = new PortMonitor();
