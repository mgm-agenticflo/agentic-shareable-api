import { ConnectionRecord } from '../types/websocket-types';
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
export declare function requireAuthentication(connection: ConnectionRecord, command: string): void;
//# sourceMappingURL=ws-auth.d.ts.map