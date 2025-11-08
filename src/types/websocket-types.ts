import { ShareableContext } from './shareable-context';

/**
 * Connection record stored in connection manager
 */
export type ConnectionRecord = {
  connectionId: string; // AWS WebSocket connection ID
  authenticated: boolean; // Whether connection has been authenticated
  shareableContext?: ShareableContext; // Only present after authentication
  sessionId?: string; // Transient session ID
  connectedAt: number; // Timestamp
  ttl: number; // TTL for DynamoDB auto-cleanup (24 hours default)
};
