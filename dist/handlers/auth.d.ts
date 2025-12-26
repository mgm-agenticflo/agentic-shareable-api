import { RequestEvent } from '../types/request-types';
import { HttpStatusCode } from 'axios';
/**
 * Authentication module for WebSocket connections
 * Handles the authenticate command that clients must send as their first message
 */
export declare const authModule: {
    /**
     * Authenticate a WebSocket connection
     *
     * This handler processes the authenticate command sent by WebSocket clients.
     * It validates the provided shareable token with the backend (just like HTTP /resource/get),
     * fetches the resource configuration, and updates the connection record.
     *
     * Expected message format:
     * {
     *   command: "authenticate",
     *   token: "shareable-token-here",
     *   sessionId?: "optional-session-id"
     * }
     *
     * Unlike HTTP which returns a transient JWT, WebSocket connections are stateful,
     * so the shareable context is stored in the connection record for subsequent messages.
     *
     * @param event - The request event containing the shareable token
     * @returns Success message with resource configuration
     * @throws {HttpCodedError} 400 - If token is missing from the request
     * @throws {HttpCodedError} 400 - If token is invalid or expired
     * @throws {HttpCodedError} 500 - If connection update fails
     */
    authenticate: (event: RequestEvent) => Promise<{
        result: {
            authenticated: boolean;
            config: import("../types/shareable-context").ShareableContext;
        };
        statusCode: HttpStatusCode;
    }>;
};
//# sourceMappingURL=auth.d.ts.map