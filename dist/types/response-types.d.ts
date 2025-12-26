export type HandlerResponse<T = unknown> = {
    result: T;
    statusCode?: number;
};
export type PublicError = {
    message: string;
    code?: string;
};
export type WebsocketResponse<T = unknown> = {
    success: boolean;
    message: string;
    result?: T;
    statusCode?: number;
    error?: PublicError;
};
//# sourceMappingURL=response-types.d.ts.map