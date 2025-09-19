import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirectory = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const logFile = path.join(logDirectory, 'app.log');

const logger = {
  log: (level: 'info' | 'warn' | 'error', message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level.toUpperCase()}] ${message} ${args.length ? JSON.stringify(args) : ''}`;

    console.log(logMessage);

    fs.appendFile(logFile, logMessage + '\n', (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  },
  info: (message: string, ...args: unknown[]) => {
    logger.log('info', message, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    logger.log('warn', message, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    logger.log('error', message, ...args);
  },
};

export default logger;
