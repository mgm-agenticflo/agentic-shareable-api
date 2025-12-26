import { Request } from 'express';
import { RequestEvent } from '../types/request-types';
/**
 * Converts an Express request/response to a RequestEvent format
 * that is compatible with existing handlers.
 *
 * This adapter allows us to reuse all existing handlers without modification
 * by converting Express's req/res format to the RequestEvent format used
 * by the Lambda handlers.
 *
 * @param req - Express request object
 * @returns RequestEvent compatible with existing handlers
 */
export declare function expressToRequestEvent(req: Request): RequestEvent;
//# sourceMappingURL=express-adapter.d.ts.map