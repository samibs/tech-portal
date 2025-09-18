import { exec } from 'child_process';
import { findProcessByPort, killProcess, killProcessByPort } from './port-manager';
import logger from '../logger';

// Mock the exec function from child_process
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  exec: jest.fn(),
}));

// Mock the logger to prevent console output during tests
jest.mock('../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockedExec = exec as unknown as jest.Mock;

describe('Port Manager', () => {
  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });
  });

  describe('findProcessByPort', () => {
    it('should find a process on a given port on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      mockedExec.mockImplementation((command, callback) => {
        if (command.includes('lsof -i :3000')) {
          callback(null, { stdout: '12345\n' });
        } else if (command.includes('ps -p 12345')) {
            callback(null, { stdout: 'test-process\n' });
        }
      });

      const processInfo = await findProcessByPort(3000);
      expect(processInfo).toEqual({ pid: 12345, name: 'test-process' });
      expect(mockedExec).toHaveBeenCalledWith('lsof -i :3000 -sTCP:LISTEN -P -t', expect.any(Function));
    });

    it('should find a process on a given port on macOS', async () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        mockedExec.mockImplementation((command, callback) => {
          if (command.includes('lsof -i tcp:3000')) {
            callback(null, { stdout: '12345\n' });
          } else if (command.includes('ps -p 12345')) {
              callback(null, { stdout: 'test-process\n' });
          }
        });

      const processInfo = await findProcessByPort(3000);
      expect(processInfo).toEqual({ pid: 12345, name: 'test-process' });
      expect(mockedExec).toHaveBeenCalledWith('lsof -i tcp:3000 -sTCP:LISTEN -P -t', expect.any(Function));
    });

    it('should find a process on a given port on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      mockedExec.mockImplementation((command, callback) => {
        if (command.includes('netstat -aon')) {
            callback(null, { stdout: '  TCP    0.0.0.0:3000          0.0.0.0:0              LISTENING       12345\n' });
        } else if (command.includes('tasklist')) {
            callback(null, { stdout: '"test-process.exe","12345","Console","1","12,345 K"\n' });
        }
      });

      const processInfo = await findProcessByPort(3000);
      expect(processInfo).toEqual({ pid: 12345, name: 'test-process.exe' });
      expect(mockedExec).toHaveBeenCalledWith('netstat -aon | findstr ":3000" | findstr "LISTENING"', expect.any(Function));
    });

    it('should return null if no process is found', async () => {
      mockedExec.mockImplementation((command, callback) => {
        callback(new Error('Command failed'), { stdout: '', stderr: 'No process found' });
      });

      const processInfo = await findProcessByPort(3000);
      expect(processInfo).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('No process found on port 3000.');
    });

    it('should throw an error for an invalid port', async () => {
      await expect(findProcessByPort(99999)).rejects.toThrow('Invalid port number provided.');
    });
  });

  describe('killProcess', () => {
    it('should kill a process on Linux/macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      mockedExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '' });
      });

      const result = await killProcess(12345);
      expect(result).toBe(true);
      expect(mockedExec).toHaveBeenCalledWith('kill -9 12345', expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('Process 12345 killed successfully.');
    });

    it('should kill a process on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      mockedExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '' });
      });

      const result = await killProcess(12345);
      expect(result).toBe(true);
      expect(mockedExec).toHaveBeenCalledWith('taskkill /PID 12345 /F', expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('Process 12345 killed successfully.');
    });

    it('should return false if killing the process fails', async () => {
      mockedExec.mockImplementation((command, callback) => {
        callback(new Error('Failed to kill'), { stdout: '', stderr: 'Error' });
      });

      const result = await killProcess(12345);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Failed to kill process 12345:', expect.any(Error));
    });
  });

  describe('killProcessByPort', () => {
    it('should find and kill a process on a given port', async () => {
        mockedExec.mockImplementation((command, callback) => {
            if (command.includes('lsof') || command.includes('netstat')) {
                callback(null, { stdout: '12345' });
            } else if(command.includes('ps') || command.includes('tasklist')){
                callback(null, {stdout: 'test-process'});
            } else if (command.includes('kill')) {
                callback(null, { stdout: '' });
            }
        });

      const result = await killProcessByPort(3000);
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Found process test-process (PID: 12345) on port 3000.');
    });

    it('should return false if no process is found on the port', async () => {
      mockedExec.mockImplementation((command, callback) => {
        callback(new Error('No process found'), { stdout: '', stderr: 'Error' });
      });

      const result = await killProcessByPort(3000);
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('No process to kill on port 3000.');
    });
  });
});
