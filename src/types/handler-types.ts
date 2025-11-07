import { RequestEvent } from './request-types';

export type HandlerResponse<T = unknown> = {
  result: T;
  statusCode?: number;
  headers?: Record<string, string>;
};

export type HandlerFn = (event: RequestEvent) => Promise<HandlerResponse>;
export type NextFn = (event: RequestEvent) => Promise<HandlerResponse>;
export type Middleware = (event: RequestEvent, next: NextFn) => Promise<HandlerResponse>;
