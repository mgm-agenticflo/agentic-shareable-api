import { CoreApiService } from '../services/core-api';
import { WithShareable } from '../types/request-types';
declare const CreateWebChatModule: (coreApi: CoreApiService) => {
    /**
     * Sends a message in a webchat session.
     *
     * This endpoint allows clients to send messages within an active webchat session
     * associated with the shareable resource. The message is processed and added to
     * the conversation history.
     *
     * @param event - The HTTP event containing the shareable context, session ID, and message payload
     * @returns An object containing the sent message details and any response
     *
     * @throws {HttpCodedError} 400 - If the message content is missing or empty
     *
     * @example
     * // Request body: { sessionId: "sess_123", message: "Hello!" }
     * // Returns: {
     *                result: {
     *                  sessionId: "sess_123",
     *                  timestamp: "2025-11-07T...",
     *                  message: [{"role": "...", "content": "..."}]
     *               }
     *            }
     */
    send: (event: WithShareable) => Promise<{
        result: import("../types/agentifclo-types").ChatMessage | undefined;
    }>;
    /**
     * Retrieves the complete message history for a webchat session.
     *
     * This endpoint fetches all messages exchanged in a specific webchat session,
     * allowing clients to display conversation history or restore session state.
     *
     * @param event - The HTTP event containing the shareable context and session ID
     * @returns An object containing the array of messages in chronological order
     *
     * @throws {HttpCodedError} 400 - If the session ID is missing
     *
     * @example
     * // Request body: { sessionId: "sess_123" }
     * // Returns: { result: [{"role": "...", "content": "..."}] }
     */
    getHistory: (event: WithShareable) => Promise<{
        result: import("../types/agentifclo-types").ChatMessage[];
    }>;
};
export type WebChatModule = ReturnType<typeof CreateWebChatModule>;
export declare const webchatModule: {
    /**
     * Sends a message in a webchat session.
     *
     * This endpoint allows clients to send messages within an active webchat session
     * associated with the shareable resource. The message is processed and added to
     * the conversation history.
     *
     * @param event - The HTTP event containing the shareable context, session ID, and message payload
     * @returns An object containing the sent message details and any response
     *
     * @throws {HttpCodedError} 400 - If the message content is missing or empty
     *
     * @example
     * // Request body: { sessionId: "sess_123", message: "Hello!" }
     * // Returns: {
     *                result: {
     *                  sessionId: "sess_123",
     *                  timestamp: "2025-11-07T...",
     *                  message: [{"role": "...", "content": "..."}]
     *               }
     *            }
     */
    send: (event: WithShareable) => Promise<{
        result: import("../types/agentifclo-types").ChatMessage | undefined;
    }>;
    /**
     * Retrieves the complete message history for a webchat session.
     *
     * This endpoint fetches all messages exchanged in a specific webchat session,
     * allowing clients to display conversation history or restore session state.
     *
     * @param event - The HTTP event containing the shareable context and session ID
     * @returns An object containing the array of messages in chronological order
     *
     * @throws {HttpCodedError} 400 - If the session ID is missing
     *
     * @example
     * // Request body: { sessionId: "sess_123" }
     * // Returns: { result: [{"role": "...", "content": "..."}] }
     */
    getHistory: (event: WithShareable) => Promise<{
        result: import("../types/agentifclo-types").ChatMessage[];
    }>;
};
export {};
//# sourceMappingURL=webchat.d.ts.map