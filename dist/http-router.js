import { Router } from 'express';
import { parseHttpEvent } from './utils/lib';
import { jwtExpressMiddleware } from './middlewares/jwt-guard';
import { resourceModule } from './handlers/resource';
import { webchatModule } from './handlers/webchat';
import { HttpStatusCode } from 'axios';
import { uploadModule } from './handlers/upload';
const applyMiddleware = (handler, middlewares) => {
    return async (event) => {
        const enrichedEvent = event;
        const executeMiddleware = async (index, currentEvent) => {
            if (index >= middlewares.length) {
                return handler(currentEvent);
            }
            const currentMiddleware = middlewares[index];
            return currentMiddleware(currentEvent, (nextEvent) => executeMiddleware(index + 1, nextEvent));
        };
        return executeMiddleware(0, enrichedEvent);
    };
};
const createExpressHandler = (handlerFn) => {
    return async (req, res, next) => {
        try {
            const requestEvent = parseHttpEvent(req);
            if (req.shareableContext) {
                requestEvent.shareableContext = req.shareableContext;
            }
            const response = await handlerFn(requestEvent);
            const statusCode = response.statusCode || HttpStatusCode.Ok;
            res.status(statusCode).json({ success: true, result: response.result || response });
        }
        catch (err) {
            next(err);
        }
    };
};
export const setupHttpRoutes = () => {
    const router = Router();
    router.post('/resource/get', createExpressHandler(resourceModule.get));
    router.post('/webchat/get-history', jwtExpressMiddleware, createExpressHandler(webchatModule.getHistory));
    router.post('/webchat/send', jwtExpressMiddleware, createExpressHandler(webchatModule.send));
    router.post('/upload/get-link', jwtExpressMiddleware, createExpressHandler(uploadModule.getUploadLink));
    router.post('/upload/confirm', jwtExpressMiddleware, createExpressHandler(uploadModule.confirmUpload));
    return router;
};
