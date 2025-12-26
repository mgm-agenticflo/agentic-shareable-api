import { Router } from 'express';
import { expressToRequestEvent } from '../adapters/express-adapter';
import { expressSuccess, expressFailure } from '../utils/response';
import { jwtGuard } from '../middlewares/jwt-guard-express';
import { resourceModule } from '../handlers/resource';
import { webchatModule } from '../handlers/webchat';
import { uploadModule } from '../handlers/upload';
import { HttpCodedError } from '../errors/http-error';
import { HttpStatusCode } from 'axios';
import { getErrorMessage } from '../utils/lib';
import logger from '../utils/logger';
const router = Router();
/**
 * Helper function to wrap handler execution with error handling
 */
async function handleRoute(req, res, handlerFn) {
    try {
        const requestEvent = expressToRequestEvent(req);
        // Add shareableContext from JWT middleware if available
        // This is set by jwtGuard middleware for protected routes
        if (req.shareableContext) {
            requestEvent.shareableContext = req.shareableContext;
        }
        const response = await handlerFn(requestEvent);
        const statusCode = response.statusCode ?? HttpStatusCode.Ok;
        expressSuccess(res, response.result, statusCode);
    }
    catch (err) {
        const msg = getErrorMessage(err);
        const statusCode = err instanceof HttpCodedError ? err.statusCode : HttpStatusCode.InternalServerError;
        logger.error(msg, err, {
            statusCode,
            path: req.path,
            method: req.method
        });
        expressFailure(res, msg, statusCode, err instanceof Error ? err : new Error(msg));
    }
}
// Public route: shareable token validation (no authentication required)
router.post('/resource/get', async (req, res) => {
    await handleRoute(req, res, resourceModule.get);
});
// Protected routes (require JWT authentication)
router.post('/webchat/get-history', jwtGuard, async (req, res) => {
    await handleRoute(req, res, webchatModule.getHistory);
});
router.post('/webchat/send', jwtGuard, async (req, res) => {
    await handleRoute(req, res, webchatModule.send);
});
router.post('/upload/get-link', jwtGuard, async (req, res) => {
    await handleRoute(req, res, uploadModule.getUploadLink);
});
router.post('/upload/confirm', jwtGuard, async (req, res) => {
    await handleRoute(req, res, uploadModule.confirmUpload);
});
export default router;
//# sourceMappingURL=http-routes.js.map