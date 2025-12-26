import { HttpStatusCode } from 'axios';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import { HttpCodedError } from './errors/http-error';
import httpRoutes from './routes/http-routes';
import { getErrorMessage } from './utils/lib';
import logger from './utils/logger';
import { expressFailure } from './utils/response';

/**
 * Creates and configures the Express application
 *
 * @returns Configured Express app instance
 */
export function createApp(): Express {
  const app = express();

  // CORS configuration - matching serverless.yml settings
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Amz-Date',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'X-Amz-User-Agent'
      ],
      credentials: true
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply base path if configured
  const basePath = process.env.HTTP_BASE_PATH || '';
  if (basePath) {
    app.use(basePath, httpRoutes);
  } else {
    app.use(httpRoutes);
  }

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    expressFailure(res, `Route not found: ${req.method} ${req.path}`, HttpStatusCode.NotFound);
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    const msg = getErrorMessage(err);
    const statusCode = err instanceof HttpCodedError ? err.statusCode : HttpStatusCode.InternalServerError;

    logger.error('Unhandled error:', err, {
      statusCode,
      path: req.path,
      method: req.method
    });

    expressFailure(res, msg, statusCode, err);
  });

  return app;
}
