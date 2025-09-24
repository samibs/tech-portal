import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

export interface ProcessInfo {
  pid: number | null;
  name: string | null;
}

/**
 * Finds the process ID (PID) of the process listening on the given port.
 *
 * @param port The port number to look for.
 * @returns A promise that resolves with the process info (PID and name) or null if no process is found.
 */
export async function findProcessByPort(port: number): Promise<ProcessInfo | null> {
  if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
    throw new Error('Invalid port number provided.');
  }

  const platform = process.platform;
  let command: string;

  if (platform === 'win32') {
    command = `netstat -aon | findstr ":${port}" | findstr "LISTENING"`;
  } else if (platform === 'darwin') {
    command = `lsof -i tcp:${port} -sTCP:LISTEN -P -t`;
  } else { // linux
    command = `lsof -i :${port} -sTCP:LISTEN -t -sTCP:LISTEN`;
  }

  try {
    const { stdout } = await execAsync(command);
    if (!stdout) {
        return null;
    }

    let pid: number | undefined;
    if (platform === 'win32') {
      const lines = stdout.trim().split('\n');
      const line = lines[0]; // Get the first line of the output
      if (line) {
        const parts = line.trim().split(/\s+/);
        const pidStr = parts[parts.length - 1];
        if (pidStr) {
            pid = parseInt(pidStr, 10);
        }
      }
    } else {
        pid = parseInt(stdout.trim().split('\n')[0], 10);
    }

    if (!pid || isNaN(pid)) {
      return null;
    }

    // Get process name
    let name = null;
    if (platform === 'win32') {
        const { stdout: tasklistOut } = await execAsync(`tasklist /fi "pid eq ${pid}" /nh /fo csv`);
        const match = tasklistOut.match(/"(.*?)"/);
        if (match) {
            name = match[1];
        }
    } else {
        const { stdout: psOut } = await execAsync(`ps -p ${pid} -o comm=`);
        name = psOut.trim();
    }


    return { pid, name };
  } catch (error) {
    // If the command fails, it likely means no process was found on that port.
    logger.warn(`No process found on port ${port}.`);
    return null;
  }
}

/**
 * Kills a process by its process ID (PID).
 *
 * @param pid The PID of the process to kill.
 * @returns A promise that resolves to true if the process was killed successfully, false otherwise.
 */
export async function killProcess(pid: number): Promise<boolean> {
  if (!pid || typeof pid !== 'number' || pid <= 0) {
    throw new Error('Invalid PID provided.');
  }

  const platform = process.platform;
  const command = platform === 'win32' ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;

  try {
    await execAsync(command);
    logger.info(`Process ${pid} killed successfully.`);
    return true;
  } catch (error) {
    logger.error(`Failed to kill process ${pid}:`, error);
    return false;
  }
}

/**
 * Finds and kills the process running on a specific port.
 *
 * @param port The port number of the process to kill.
 * @returns A promise that resolves with the process info of the killed process, or null if no process was killed.
 */
export async function killProcessByPort(port: number): Promise<ProcessInfo | null> {
  try {
    const processInfo = await findProcessByPort(port);
    if (processInfo && processInfo.pid) {
      logger.info(`Found process ${processInfo.name} (PID: ${processInfo.pid}) on port ${port}.`);
      const success = await killProcess(processInfo.pid);
      return success ? processInfo : null;
    } else {
      logger.warn(`No process to kill on port ${port}.`);
      return null;
    }
  } catch (error) {
    logger.error(`Error killing process on port ${port}:`, error);
    return null;
  }
}

export async function findProcessByPid(pid: number): Promise<ProcessInfo | null> {
    if (!pid || typeof pid !== 'number' || pid <= 0) {
      throw new Error('Invalid PID provided.');
    }

    const platform = process.platform;
    let command: string;

    if (platform === 'win32') {
      command = `tasklist /fi "pid eq ${pid}" /nh /fo csv`;
    } else {
      command = `ps -p ${pid} -o comm=`;
    }

    try {
      const { stdout } = await execAsync(command);
      if (!stdout.trim()) {
        return null;
      }

      let name = null;
      if (platform === 'win32') {
          const match = stdout.match(/"(.*?)"/);
          if (match) {
              name = match[1];
          }
      } else {
          name = stdout.trim();
      }

      return { pid, name };
    } catch (error) {
      logger.warn(`No process found with PID ${pid}.`);
      return null;
    }
  }
