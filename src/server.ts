import 'dotenv/config';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { setupHttpRoutes } from './http-router';
import { setupErrorHandler } from './middlewares/error-handler';
import logger from './utils/logger';
import { setupWebSocketServer } from './websocket-server';

const HTTP_PORT = process.env.OFFLINE_HTTP_PORT || process.env.PORT || '6000';

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

const basePath = process.env.HTTP_BASE_PATH || '';
if (basePath) {
  app.use(basePath, setupHttpRoutes());
} else {
  app.use(setupHttpRoutes());
}

app.use(setupErrorHandler());

const server = app.listen(Number(HTTP_PORT), '0.0.0.0', () => {
  logger.info(`HTTP server listening on port ${HTTP_PORT}`, { basePath });
});

const wss = setupWebSocketServer();

export { app, server, wss };
