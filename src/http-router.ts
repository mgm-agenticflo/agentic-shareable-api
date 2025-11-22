import { HttpStatusCode } from 'axios';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { resourceModule } from './handlers/resource';
import { uploadModule } from './handlers/upload';
import { webchatModule } from './handlers/webchat';
import { jwtExpressMiddleware } from './middlewares/jwt-guard';
import { HandlerFn } from './types/handler-types';
import { parseHttpEvent } from './utils/lib';

const createExpressHandler = (handlerFn: HandlerFn) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        const requestEvent = parseHttpEvent(req);
        if ((req as unknown as { shareableContext?: unknown }).shareableContext) {
          requestEvent.shareableContext = (req as unknown as { shareableContext: unknown })
            .shareableContext as typeof requestEvent.shareableContext;
        }
        const response = await handlerFn(requestEvent);
        const statusCode = response.statusCode || HttpStatusCode.Ok;
        res.status(statusCode).json({ success: true, result: response.result || response });
      } catch (err: unknown) {
        next(err);
      }
    })();
  };
};

export const setupHttpRoutes = (): Router => {
  const router = Router();

  router.post('/resource/get', createExpressHandler(resourceModule.get as HandlerFn));

  router.post(
    '/webchat/get-history',
    jwtExpressMiddleware,
    createExpressHandler(webchatModule.getHistory as HandlerFn)
  );

  router.post('/webchat/send', jwtExpressMiddleware, createExpressHandler(webchatModule.send as HandlerFn));

  router.post('/upload/get-link', jwtExpressMiddleware, createExpressHandler(uploadModule.getUploadLink as HandlerFn));

  router.post('/upload/confirm', jwtExpressMiddleware, createExpressHandler(uploadModule.confirmUpload as HandlerFn));

  return router;
};
