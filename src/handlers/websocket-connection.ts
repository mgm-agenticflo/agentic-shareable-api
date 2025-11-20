import { APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { connectionManager } from '../services/connection-manager';
import { success } from '../utils/response';
import logger from '../utils/logger';

/**
 * Handle WebSocket $connect event
 * Accepts all connections WITHOUT authentication
 *
 * Authentication is deferred to the first message the client sends.
 * This follows the proper WebSocket pattern where connection and authentication
 * are separate concerns, allowing clients to authenticate after connecting.
 */
export async function handleConnect(
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const connectionId = event.requestContext.connectionId;

  try {
    // Store unauthenticated connection in DynamoDB
    // Client must authenticate via first message
    await connectionManager.saveConnection(connectionId);

    return success();
  } catch (error) {
    logger.error(`Error in $connect handler:`, error);
    // Still accept the connection - client can try to authenticate
    return success();
  }
}

/**
 * Handle WebSocket $disconnect event
 * Removes the connection
 */
export async function handleDisconnect(
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const connectionId = event.requestContext.connectionId;

  try {
    // Remove connection
    await connectionManager.deleteConnection(connectionId);

    return success();
  } catch (error) {
    logger.error(`Error in $disconnect handler:`, error);
    // Still return success since the connection is already closed
    return success();
  }
}
