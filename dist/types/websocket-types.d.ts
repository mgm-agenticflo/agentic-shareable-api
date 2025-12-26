import { ShareableContext } from './shareable-context';
/**
 * Connection record stored in connection manager
 */
export type ConnectionRecord = {
    connectionId: string;
    authenticated: boolean;
    shareableContext?: ShareableContext;
    sessionId?: string;
    connectedAt: number;
    ttl: number;
};
//# sourceMappingURL=websocket-types.d.ts.map