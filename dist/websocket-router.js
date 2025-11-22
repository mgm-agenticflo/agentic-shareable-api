import { connectionManager } from './services/connection-manager';
import { getErrorMessage } from './utils/lib';
import { HttpCodedError } from './errors/http-error';
import { HttpStatusCode } from 'axios';
import logger from './utils/logger';
import { requireAuthentication } from './middlewares/ws-auth';
import { resourceModule } from './handlers/resource';
import { webchatModule } from './handlers/webchat';
import { uploadModule } from './handlers/upload';
import { authModule } from './handlers/auth';
const messageRoutingMap = {
    authenticate: authModule.authenticate,
    'resource:get': resourceModule.get,
    'webchat:get-history': webchatModule.getHistory,
    'webchat:send': webchatModule.send,
    'upload:get-link': uploadModule.getUploadLink,
    'upload:confirm': uploadModule.confirmUpload
};
function parseWebSocketMessage(message, connectionData, connectionId, ws) {
    const rawCommand = message.command || '';
    const [resource, action] = rawCommand.split(':');
    const { command, ...parsedBody } = message;
    void command;
    return {
        websocketContext: {
            connectionId,
            ws
        },
        shareableContext: connectionData.shareableContext,
        parsedBody,
        targetResource: {
            method: 'WS',
            resource,
            action
        }
    };
}
export async function handleWebSocketMessage(connectionId, message, ws) {
    try {
        const connection = await connectionManager.getConnection(connectionId);
        if (!connection) {
            logger.warn(`Message from unknown connection: ${connectionId}`);
            ws.send(JSON.stringify({
                success: false,
                command: message.command || 'unknown',
                message: 'Connection not found',
                error: { message: 'Connection not found', code: 'NOT_FOUND' },
                statusCode: HttpStatusCode.NotFound
            }));
            return;
        }
        const requestEvent = parseWebSocketMessage(message, connection, connectionId, ws);
        const { resource, action } = requestEvent.targetResource;
        const command = action ? `${resource}:${action}` : resource;
        const handler = messageRoutingMap[command];
        if (!handler) {
            logger.warn(`Unknown command: ${command}`);
            ws.send(JSON.stringify({
                success: false,
                command,
                message: `Unknown command: ${command}`,
                error: { message: `Unknown command: ${command}`, code: 'UNKNOWN_COMMAND' },
                statusCode: HttpStatusCode.BadRequest
            }));
            return;
        }
        if (command !== 'authenticate') {
            requireAuthentication(connection, command);
        }
        const handlerResponse = await handler(requestEvent);
        ws.send(JSON.stringify({
            success: true,
            command,
            result: handlerResponse.result,
            statusCode: handlerResponse.statusCode || HttpStatusCode.Ok
        }));
    }
    catch (err) {
        const msg = getErrorMessage(err);
        logger.error(`Error handling WebSocket message: ${msg}`, err);
        try {
            const command = message.command || 'unknown';
            if (err instanceof HttpCodedError) {
                ws.send(JSON.stringify({
                    success: false,
                    command,
                    message: err.message,
                    error: { message: err.message, code: err.details ? String(err.details) : undefined },
                    statusCode: err.statusCode
                }));
                if (err.shouldClose) {
                    ws.close();
                }
            }
            else {
                ws.send(JSON.stringify({
                    success: false,
                    command,
                    message: 'Internal server error',
                    error: { message: msg, code: 'INTERNAL_ERROR' },
                    statusCode: HttpStatusCode.InternalServerError
                }));
            }
        }
        catch (sendError) {
            logger.error(`Failed to send error message to client:`, sendError);
        }
    }
}
