import { ConnectionRecord } from '../types/websocket-types';
import { ShareableContext } from '../types/shareable-context';
/**
 * Create an in-memory connection manager for offline/local development
 *
 * This factory function creates a connection manager that stores WebSocket connections
 * in memory using a Map. It includes automatic cleanup of expired connections via a
 * periodic interval timer. Ideal for local development and testing.
 *
 * @param connections - A Map to store connection records, keyed by connection ID
 * @returns An object with methods to manage WebSocket connections in memory
 */
export declare const CreateInMemoryConnectionManager: (connections: Map<string, ConnectionRecord>) => {
    init: () => void;
    destroy: () => void;
    saveConnection: (connectionId: string, shareableContext?: ShareableContext, sessionId?: string) => Promise<void>;
    getConnection: (connectionId: string) => Promise<ConnectionRecord | null>;
    deleteConnection: (connectionId: string) => Promise<void>;
    getConnectionsByChannel: (channelId: string) => Promise<ConnectionRecord[]>;
    getConnectionsByResourceId: (resourceType: string, resourceId: string) => Promise<ConnectionRecord[]>;
};
export type InMemoryConnectionManager = ReturnType<typeof CreateInMemoryConnectionManager>;
//# sourceMappingURL=memory-connection-manager.d.ts.map