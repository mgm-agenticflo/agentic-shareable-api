export type ErrorDetails = {
    code?: string;
    backendMessage?: string;
};
export declare class HttpCodedError extends Error {
    statusCode: number;
    message: string;
    details?: unknown | undefined;
    shouldClose: boolean;
    constructor(statusCode: number, message: string, details?: unknown | undefined, shouldClose?: boolean);
}
//# sourceMappingURL=http-error.d.ts.map