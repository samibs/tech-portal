import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from './logger';

let wss: WebSocketServer;

export function setupWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');

    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
    });
  });

  logger.info('WebSocket server set up');
}

export function broadcast(data: any) {
  if (!wss) {
    return;
  }

  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
