import { HttpCodedError } from '../errors/http-error';
import { HttpStatusCode } from 'axios';
import logger from '../utils/logger';
/**
 * WebSocket authentication check
 *
 * Verifies that a connection has been authenticated before processing messages.
 * This should be called for all WebSocket commands EXCEPT the 'authenticate' command itself.
 *
 * @param connection - The connection record from DynamoDB
 * @param command - The command being executed (for logging purposes)
 * @throws {HttpCodedError} 401 - If connection is not authenticated
 */
export function requireAuthentication(connection, command) {
    if (!connection.authenticated || !connection.shareableContext) {
        logger.warn(`Unauthenticated connection ${connection.connectionId} attempted to execute: ${command}`);
        throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Connection not authenticated. Please send authenticate command first.', true // shouldClose - disconnect unauthenticated clients
        );
    }
}
