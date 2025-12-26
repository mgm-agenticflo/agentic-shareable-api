import { handleConnect, handleDisconnect } from './handlers/websocket-connection';
import { connectionManager } from './services/connection-manager';
import { websocketClient } from './services/websocket-client';
import { getErrorMessage, safeJson } from './utils/lib';
import { failure, success, wsFailure, wsSuccess } from './utils/response';
import { HttpCodedError } from './errors/http-error';
import { HttpStatusCode } from 'axios';
import logger from './utils/logger';
import { requireAuthentication } from './middlewares/ws-auth';
import { resourceModule } from './handlers/resource';
import { webchatModule } from './handlers/webchat';
import { uploadModule } from './handlers/upload';
import { authModule } from './handlers/auth';
/**
 * Routing map for WebSocket messages
 * Reuses the exact same handlers as HTTP!
 * Format: { "resource:action": handler }
 */
const messageRoutingMap = {
    // Authentication handler - must be called first after connection
    // Client sends: { command: "authenticate", token: "shareable-token" }
    authenticate: authModule.authenticate,
    // Public resource handler (no auth needed, validated via shareable token)
    'resource:get': resourceModule.get,
    // Protected handlers (auth required via authenticate command)
    // webchat handlers
    'webchat:get-history': webchatModule.getHistory,
    'webchat:send': webchatModule.send,
    // Upload handlers
    'upload:get-link': uploadModule.getUploadLink,
    'upload:confirm': uploadModule.confirmUpload
};
/**
 * Parse WebSocket message and create RequestEvent
 * Converts: { command: "webchat:send", message: "Hello" }
 * Into: RequestEvent with targetResource: { method: "WS", resource: "webchat", action: "send" }
 */
function parseWebSocketMessage(event, connectionData) {
    const body = safeJson(event.body);
    const message = body;
    // Parse command format: "resource:action"
    const rawCommand = message.command || '';
    const [resource, action] = rawCommand.split(':');
    // Create a copy without the command field for parsedBody
    const { command, ...parsedBody } = message;
    void command;
    return {
        websocketContext: event,
        shareableContext: connectionData.shareableContext,
        parsedBody,
        targetResource: {
            method: 'WS',
            resource,
            action
        }
    };
}
/**
 * Get WebSocket endpoint URL from event
 * In offline mode, always use localhost regardless of what the proxy reports
 */
function getWebSocketEndpoint(event) {
    // In offline mode, force localhost endpoint
    if (process.env.IS_OFFLINE === 'true') {
        const port = process.env.OFFLINE_WS_PORT || '6001';
        const endpoint = `http://localhost:${port}`;
        logger.debug(`[OFFLINE MODE] Using WebSocket endpoint: ${endpoint}`);
        return endpoint;
    }
    // In production, use the actual domain from the event
    const { domainName, stage } = event.requestContext;
    return `https://${domainName}/${stage}`;
}
/**
 * Handle WebSocket $default route (message handling)
 * This reuses existing HTTP handlers!
 */
async function handleMessage(event) {
    const connectionId = event.requestContext.connectionId;
    const endpoint = getWebSocketEndpoint(event);
    try {
        // Retrieve connection data from DynamoDB
        const connection = await connectionManager.getConnection(connectionId);
        if (!connection) {
            logger.warn(`Message from unknown connection: ${connectionId}`);
            await websocketClient.sendToConnection(endpoint, connectionId, '', wsFailure('Connection not found', HttpStatusCode.NotFound));
            return failure('Connection not found', HttpStatusCode.NotFound);
        }
        // Parse the message into RequestEvent format
        const requestEvent = parseWebSocketMessage(event, connection);
        const { resource, action } = requestEvent.targetResource;
        // Build command key - handle single-word commands (like "authenticate") without action
        const command = action ? `${resource}:${action}` : resource;
        // Look up handler in routing map
        const handler = messageRoutingMap[command];
        if (!handler) {
            logger.warn(`Unknown command: ${command}`);
            await websocketClient.sendToConnection(endpoint, connectionId, command, wsFailure(`Unknown command: ${command}`, HttpStatusCode.BadRequest));
            return success(); // Return success to Lambda, error sent to client
        }
        // Check authentication for all commands except 'authenticate'
        if (command !== 'authenticate') {
            requireAuthentication(connection, command);
        }
        // Execute the handler
        const handlerResponse = await handler(requestEvent);
        // Send response back to the client
        // handlerResponse has shape { result, statusCode }, extract result for WebSocket response
        await websocketClient.sendToConnection(endpoint, connectionId, command, wsSuccess(handlerResponse.result, handlerResponse.statusCode));
        return success();
    }
    catch (err) {
        const msg = getErrorMessage(err);
        logger.error(`Error handling WebSocket message ${msg}`, err);
        // Try to send error to client
        try {
            const body = safeJson(event.body);
            const command = body.command || 'unknown';
            if (err instanceof HttpCodedError) {
                await websocketClient.sendToConnection(endpoint, connectionId, command, wsFailure(err.message, err.statusCode));
                // Disconnect if the error requires it
                if (err.shouldClose) {
                    await websocketClient.disconnect(endpoint, connectionId);
                }
            }
            else {
                await websocketClient.sendToConnection(endpoint, connectionId, command, wsFailure('Internal server error', HttpStatusCode.InternalServerError));
            }
        }
        catch (sendError) {
            logger.error(`Failed to send error message to client:`, sendError);
        }
        return success(); // Always return success to Lambda
    }
}
/**
 * Main WebSocket Lambda handler
 * Routes to appropriate handler based on route key
 */
export const handler = async (event) => {
    const routeKey = event.requestContext.routeKey;
    try {
        switch (routeKey) {
            case '$connect':
                return await handleConnect(event);
            case '$disconnect':
                return await handleDisconnect(event);
            case '$default':
                return await handleMessage(event);
            default:
                logger.warn(`Unknown route key: ${routeKey}`);
                return failure(`Unknown route: ${routeKey}`, HttpStatusCode.BadRequest);
        }
    }
    catch (err) {
        const msg = getErrorMessage(err);
        logger.error(`WebSocket handler error:`, err);
        return failure(msg, HttpStatusCode.InternalServerError);
    }
};
//# sourceMappingURL=websocket-router.js.map