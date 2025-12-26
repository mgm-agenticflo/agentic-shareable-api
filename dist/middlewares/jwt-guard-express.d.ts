import { Request, Response, NextFunction } from 'express';
/**
 * Express middleware that validates JWT tokens from the Authorization header.
 *
 * This middleware:
 * 1. Extracts the JWT token from the Authorization header (must be in Bearer token format)
 * 2. Verifies the token using the token service
 * 3. Adds the decoded ShareableContext to the request object (req.shareableContext)
 * 4. Calls next() to continue to the next middleware/handler
 *
 * The Authorization header must follow the format: `Bearer <token>`
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @throws {HttpCodedError} 401 Unauthorized - If Authorization header is missing or invalid
 * @throws {HttpCodedError} 401 Unauthorized - If Authorization format is not "Bearer <token>"
 * @throws {HttpCodedError} 422 Unprocessable Entity - If token verification fails
 *
 * @example
 * ```typescript
 * // Apply middleware to a route
 * app.post('/protected', jwtGuard, handler);
 *
 * // In handler, access the shareable context
 * const handler = (req: Request, res: Response) => {
 *   const context = req.shareableContext;
 *   console.log('Shareable Token:', context.token);
 * };
 * ```
 */
export declare const jwtGuard: (req: Request, res: Response, next: NextFunction) => void;
declare module 'express-serve-static-core' {
    interface Request {
        shareableContext?: import('../types/shareable-context').ShareableContext;
    }
}
//# sourceMappingURL=jwt-guard-express.d.ts.map