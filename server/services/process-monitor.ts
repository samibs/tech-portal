import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface ProcessInfo {
  pid: number;
  port: number;
  command: string;
  cpu: number;
  memory: number;
  uptime: number;
  status: 'running' | 'zombie' | 'orphaned' | 'listening';
  ppid: number;
  user: string;
}

export interface PortInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'LISTEN' | 'ESTABLISHED' | 'TIME_WAIT' | 'CLOSE_WAIT';
  pid: number;
  process: string;
  address: string;
}

export class ProcessMonitor extends EventEmitter {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly intervalMs: number = 5000; // 5 seconds
  private knownProcesses: Map<number, ProcessInfo> = new Map();
  private knownPorts: Map<number, PortInfo> = new Map();

  constructor() {
    super();
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      return;
    }

    console.log('🔍 Starting process and port monitoring...');

    // Initial scan
    await this.scanProcesses();
    await this.scanPorts();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.scanProcesses();
        await this.scanPorts();
        await this.detectGhostProcesses();
      } catch (error) {
        console.error('Error during monitoring cycle:', error);
        this.emit('error', error);
      }
    }, this.intervalMs);

    this.emit('monitoring-started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Process monitoring stopped');
      this.emit('monitoring-stopped');
    }
  }

  async scanPorts(): Promise<PortInfo[]> {
    try {
      // Use netstat to get port information
      const { stdout } = await execAsync('netstat -tulpn 2>/dev/null || ss -tulpn 2>/dev/null');
      const ports: PortInfo[] = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        const portInfo = this.parsePortLine(line);
        if (portInfo) {
          ports.push(portInfo);

          // Check for new ports
          if (!this.knownPorts.has(portInfo.port)) {
            this.emit('port-opened', portInfo);
          }

          this.knownPorts.set(portInfo.port, portInfo);
        }
      }

      // Check for closed ports
      for (const [port, info] of this.knownPorts.entries()) {
        if (!ports.find(p => p.port === port)) {
          this.emit('port-closed', info);
          this.knownPorts.delete(port);
        }
      }

      return ports;
    } catch (error) {
      console.error('Error scanning ports:', error);
      return [];
    }
  }

  async scanProcesses(): Promise<ProcessInfo[]> {
    try {
      // Use ps to get detailed process information
      const { stdout } = await execAsync('ps aux --no-headers');
      const processes: ProcessInfo[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const processInfo = this.parseProcessLine(line);
        if (processInfo) {
          processes.push(processInfo);

          // Check for new processes
          if (!this.knownProcesses.has(processInfo.pid)) {
            this.emit('process-started', processInfo);
          }

          this.knownProcesses.set(processInfo.pid, processInfo);
        }
      }

      // Check for terminated processes
      for (const [pid, info] of this.knownProcesses.entries()) {
        if (!processes.find(p => p.pid === pid)) {
          this.emit('process-terminated', info);
          this.knownProcesses.delete(pid);
        }
      }

      return processes;
    } catch (error) {
      console.error('Error scanning processes:', error);
      return [];
    }
  }

  async detectGhostProcesses(): Promise<ProcessInfo[]> {
    const ghostProcesses: ProcessInfo[] = [];

    for (const [pid, process] of this.knownProcesses.entries()) {
      // Check if process is a potential ghost
      if (await this.isGhostProcess(process)) {
        process.status = 'zombie';
        ghostProcesses.push(process);
        this.emit('ghost-process-detected', process);
      }
    }

    return ghostProcesses;
  }

  async killProcess(pid: number, signal: string = 'SIGTERM'): Promise<boolean> {
    try {
      await execAsync(`kill -${signal} ${pid}`);
      console.log(`🔪 Killed process ${pid} with signal ${signal}`);
      this.emit('process-killed', { pid, signal });
      return true;
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error);
      return false;
    }
  }

  async killProcessOnPort(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || fuser -k ${port}/tcp 2>/dev/null`);
      const pids = stdout.trim().split('\n').filter(pid => pid.trim());

      for (const pid of pids) {
        await this.killProcess(parseInt(pid));
      }

      console.log(`🔪 Killed processes on port ${port}`);
      return true;
    } catch (error) {
      console.error(`Failed to kill processes on port ${port}:`, error);
      return false;
    }
  }

  async getPortUsage(): Promise<{ used: number[], available: number[], conflicts: PortInfo[] }> {
    const ports = await this.scanPorts();
    const usedPorts = ports.map(p => p.port);
    const conflicts = ports.filter(p =>
      ports.filter(other => other.port === p.port).length > 1
    );

    // Generate list of commonly used ports that are available
    const commonPorts = Array.from({ length: 100 }, (_, i) => 3000 + i);
    const availablePorts = commonPorts.filter(port => !usedPorts.includes(port));

    return {
      used: usedPorts,
      available: availablePorts.slice(0, 50), // Return first 50 available
      conflicts
    };
  }

  private parsePortLine(line: string): PortInfo | null {
    try {
      // Parse netstat/ss output
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) return null;

      const protocol = parts[0].toLowerCase() as 'tcp' | 'udp';
      const localAddress = parts[3] || parts[4];
      const state = parts[5] || 'UNKNOWN';
      const processInfo = parts[6] || '';

      if (!localAddress.includes(':')) return null;

      const portMatch = localAddress.match(/:(\d+)$/);
      if (!portMatch) return null;

      const port = parseInt(portMatch[1]);
      const pidMatch = processInfo.match(/(\d+)\//);
      const pid = pidMatch ? parseInt(pidMatch[1]) : 0;
      const processName = processInfo.split('/')[1] || 'unknown';

      return {
        port,
        protocol,
        state: state as any,
        pid,
        process: processName,
        address: localAddress.split(':')[0] || '0.0.0.0'
      };
    } catch (error) {
      return null;
    }
  }

  private parseProcessLine(line: string): ProcessInfo | null {
    try {
      // Parse ps aux output
      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) return null;

      const user = parts[0];
      const pid = parseInt(parts[1]);
      const ppid = parseInt(parts[2]) || 0;
      const cpu = parseFloat(parts[2]) || 0;
      const memory = parseFloat(parts[3]) || 0;
      const command = parts.slice(10).join(' ');

      // Calculate uptime (simplified)
      const uptime = 0; // Would need additional parsing

      return {
        pid,
        port: 0, // Will be filled by port scanning
        command,
        cpu,
        memory,
        uptime,
        status: 'running',
        ppid,
        user
      };
    } catch (error) {
      return null;
    }
  }

  private async isGhostProcess(process: ProcessInfo): Promise<boolean> {
    try {
      // Check if process is zombie or orphaned
      const { stdout } = await execAsync(`ps -o stat= -p ${process.pid} 2>/dev/null`);
      const stat = stdout.trim();

      // Z = zombie, D = uninterruptible sleep (often indicates problems)
      if (stat.includes('Z') || stat.includes('D')) {
        return true;
      }

      // Check if parent process exists
      if (process.ppid > 1) {
        try {
          await execAsync(`ps -p ${process.ppid} 2>/dev/null`);
        } catch {
          // Parent doesn't exist, might be orphaned
          return true;
        }
      }

      // Check for high resource usage with no activity
      if (process.cpu > 90 && process.memory > 90) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  getKnownProcesses(): ProcessInfo[] {
    return Array.from(this.knownProcesses.values());
  }

  getKnownPorts(): PortInfo[] {
    return Array.from(this.knownPorts.values());
  }

  async findAvailablePort(startPort: number = 3000): Promise<number> {
    const usedPorts = Array.from(this.knownPorts.keys());

    for (let port = startPort; port < startPort + 1000; port++) {
      if (!usedPorts.includes(port)) {
        // Double-check by trying to bind
        try {
          const { stdout } = await execAsync(`netstat -an | grep :${port} | grep LISTEN`);
          if (!stdout.trim()) {
            return port;
          }
        } catch {
          return port; // Port is available
        }
      }
    }

    throw new Error('No available ports found in range');
  }
}

export const processMonitor = new ProcessMonitor();
