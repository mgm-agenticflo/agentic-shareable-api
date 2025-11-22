export class HttpCodedError extends Error {
    statusCode;
    message;
    details;
    shouldClose;
    constructor(statusCode, message, details, shouldClose = false) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;
        this.shouldClose = shouldClose;
        this.name = 'HttpCodedError';
    }
}
