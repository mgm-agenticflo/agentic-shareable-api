import { RequestEvent } from './request-types';
import { HandlerResponse } from './response-types';
export type HandlerFn = (event: RequestEvent) => Promise<HandlerResponse>;
export type NextFn = (event: RequestEvent) => Promise<HandlerResponse>;
export type Middleware = (event: RequestEvent, next: NextFn) => Promise<HandlerResponse>;
//# sourceMappingURL=handler-types.d.ts.map