# Agentic Shareables Middleware

This repository is a Serverless Framework project that exposes Lambda handlers which perform in-process routing to
feature modules under `src/`. The goal is to act as a secure, minimal "backplane" between untrusted web clients and the
core API, supporting both **HTTP** and **WebSocket** protocols.

## Core Entrypoints

### HTTP Router

- **Function**: `handler` in `src/http-router.ts`
- **Declared in**: `serverless.yml` as `functions.httpRouter.handler`
- **Behavior**: Serverless (and serverless-offline) send all matching HTTP API routes to this handler, which then
  dispatches to internal handlers based on the request path and method

### WebSocket Router

- **Function**: `handler` in `src/websocket-router.ts`
- **Declared in**: `serverless.yml` as `functions.websocketRouter.handler`
- **Behavior**: Handles WebSocket connections (`$connect`, `$disconnect`, `$default`) and routes messages to the **same
  handlers** used by HTTP
- **Key Feature**: Reuses all existing HTTP handlers with a unified `RequestEvent` structure

## How Routing Works (Read This First)

### HTTP Routing

1. Incoming API Gateway HTTP events are parsed by `parseHttpEvent` in `src/utils/lib.ts`
   - It extracts: `method` (e.g., `POST`), `resource` (first path segment), `action` (second path segment)
   - Example: `POST /webchat/send` => `method=POST`, `resource=webchat`, `action=send`

2. `src/http-router.ts` maintains a `routingMap` of shape `Record<resource, Record<"METHOD:action", HandlerFn>>`
   - Example keys: `'POST:get'`, `'POST:send'`, `'POST:get-history'`
   - The method string is taken verbatim from API Gateway; keep it exact (`POST`/`GET` etc.) in `routingMap` keys

3. `applyMiddleware` in `src/http-router.ts` composes handlers with middlewares (e.g., JWT auth)

4. The handler looks up `routingMap[resource]["METHOD:action"]`, executes it, and returns a standardized JSON response
   via `utils/response.ts`

**Important**: Serverless route paths must align with the internal resource/action pattern. If your route path omits the
second segment (action), `parseHttpEvent` will set `action=undefined` and the router will not find entries like
`'POST:get'` or `'POST:send'`. When adding new HTTP API routes in `serverless.yml`, prefer patterns like
`/<resource>/<action>` to match the internal router's expectations.

### WebSocket Routing

1. Clients connect to WebSocket **without authentication**
   - `$connect` handler accepts all connections and stores them in DynamoDB
   - Authentication is **deferred** to the first message (proper WebSocket pattern)

2. **First message must be authentication**:
   - Format: `{ command: "authenticate", token: "SHAREABLE_TOKEN", sessionId: "optional" }`
   - `src/handlers/auth.ts` validates the shareable token with the backend (same as HTTP `/resource/get`)
   - Returns: `{ success: true, command: "authenticate", result: { authenticated: true, config } }`
   - **All subsequent commands require successful authentication**

3. Clients send JSON messages with format: `{ command: "resource:action", ...params }`
   - Example: `{ command: "webchat:send", message: "Hello!" }`
   - The `command` field is parsed into `resource` and `action`
   - `src/middlewares/ws-auth.ts` verifies authentication before processing

4. `src/websocket-router.ts` maintains a `messageRoutingMap` of shape `Record<"resource:action", HandlerFn>`
   - Example keys: `'authenticate'`, `'webchat:send'`, `'webchat:get-history'`, `'upload:get-link'`
   - **These map to the exact same handlers used by HTTP!**

5. WebSocket message is converted to `RequestEvent` with:
   - `targetResource: { method: "WS", resource, action }`
   - `parsedBody`: Message content (without `command` field)
   - `shareableContext`: Retrieved from DynamoDB connection record (after authentication)
   - `websocketContext`: AWS WebSocket event context

6. Handler executes and response is sent back via WebSocket using `src/services/websocket-client.ts`

**Key Insight**: Both HTTP and WebSocket use the **same `RequestEvent` type** and **same handlers**. The only difference
is how the event is constructed and how responses are delivered.

**Why separate connection from authentication?**
- AWS API Gateway WebSocket headers/query params cannot be changed after `$connect`
- This allows clients to authenticate (and re-authenticate) after establishing the connection
- Follows standard WebSocket patterns where connection establishment and authentication are separate concerns

## Implemented Routes

All HTTP responses follow `utils/response.ts` shapes: success => `{ success: true, result }`, error =>
`{ success: false, message, error }`.

All WebSocket responses follow: success => `{ success: true, command, result }`, error =>
`{ success: false, command, error }`.

### Public, no auth

#### HTTP

- **POST /resource/get** → `src/handlers/resource.ts`, `resourceModule.get`
  - Body: `{ token: string }`
  - Returns: `{ config: ShareableContext, authToken: string }`
  - Generates a transient client JWT auth token for subsequent authenticated calls

#### WebSocket

- **Command: `authenticate`** → `src/handlers/auth.ts`, `authModule.authenticate`
  - **REQUIRED as first message after connecting**
  - Message: `{ command: "authenticate", token: "SHAREABLE_TOKEN", sessionId?: "optional" }`
  - The token is the shareable token (NOT a JWT) - same as HTTP `/resource/get`
  - Validates with backend and returns resource configuration
  - Returns: `{ success: true, command: "authenticate", result: { authenticated: true, config } }`
  - Connection must be authenticated before any other commands will work

- **Command: `resource:get`** → Same handler: `resourceModule.get`
  - Message: `{ command: "resource:get", token: "..." }`
  - Returns: `{ success: true, command: "resource:get", result: { config, authToken } }`

### Authenticated

**HTTP**: Use `Authorization: Bearer <authToken>` header (from `/resource/get`)

**WebSocket**: Send `authenticate` command as first message after connecting (see above)

#### Webchat

**HTTP:**

- **POST /webchat/get-history** → `src/handlers/webchat.ts`, `webchatModule.getHistory`
  - Body: `{ sessionId: string }`
  - Returns: `ChatMessage[]` (conversation history)

- **POST /webchat/send** → `src/handlers/webchat.ts`, `webchatModule.send`
  - Body: `{ sessionId: string, message: string, ... }`
  - Returns: `ChatMessage` (created/processed message)

**WebSocket:** (Same handlers)

- **Command: `webchat:get-history`**
  - Message: `{ command: "webchat:get-history", sessionId: "..." }`
  - Returns: `{ success: true, command: "webchat:get-history", result: [...] }`

- **Command: `webchat:send`**
  - Message: `{ command: "webchat:send", sessionId: "...", message: "Hello!" }`
  - Returns: `{ success: true, command: "webchat:send", result: {...} }`

#### Upload

**HTTP:**

- **POST /upload/get-link** → `src/handlers/upload.ts`, `uploadModule.getUploadLink`
  - Body: `FileCreateDTO`
  - Returns: `SignedUrl { url, file }`

- **POST /upload/confirm** → `src/handlers/upload.ts`, `uploadModule.confirmUpload`
  - Body: `FileConfirmationDTO`
  - Returns: `FileDTO`

**WebSocket:** (Same handlers)

- **Command: `upload:get-link`**
  - Message: `{ command: "upload:get-link", fileName: "doc.pdf", ... }`
  - Returns: `{ success: true, command: "upload:get-link", result: { url, file } }`

- **Command: `upload:confirm`**
  - Message: `{ command: "upload:confirm", fileId: "...", ... }`
  - Returns: `{ success: true, command: "upload:confirm", result: {...} }`

## Handlers and Middleware Structure

- Modules live under `src/handlers` and export functions that return `{ result, statusCode?, headers? }` (see
  `src/types/handler-types.ts`)
  - Handlers are small and delegate to services in `src/services`
  - Handlers should throw `HttpCodedError` (`src/errors/http-error.ts`) for request/validation errors; http-router will
    format the response appropriately

- The JWT middleware (`src/middlewares/jwt-guard.ts`)
  - Reads Authorization header in "Bearer <token>" format
  - Verifies token using `tokenService` (`src/services/transient-token.ts`)
  - Injects `shareableContext` into `RequestEvent` for downstream handlers

- Request event model (`src/types/request-types.ts`)
  - `RequestEvent` contains: `httpContext`, `parsedBody`, `targetResource { method, resource, action? }`, and optional
    `shareableContext`
  - Helper types: `WithShareable`, `WithHttp` for handlers that require guaranteed contexts

## Services

### Core API client (`src/services/core-api.ts`)

- `getConfiguration(shareableToken)`: `ShareableContext`
- `sendWebchatMessage(sessionId, payload, shareableToken)`: `ChatMessage`
- `getWebchatHistory(sessionId, shareableToken)`: `ChatMessage[]`
- `getPresignedUploadUrl(fileCreate, shareableToken)`: `SignedUrl`
- `confirmFileUpload(fileConfirmation, shareableToken)`: `FileDTO`
- Uses `x-shareable-token` header to authenticate against the Core API

### HTTP client (`src/services/http-client.ts`)

- `createHttpClient` / `getHttpClient` build a configured Axios instance with logging and consistent error mapping
- Maps backend errors to frontend-safe `HttpCodedError` values (status/message) before surfacing them to handlers

### Transient token service (`src/services/transient-token.ts`)

- `generate(payload, expiresIn?)` => JWT
- `verify(token)` => `ShareableContext | null`
- Used to mint short-lived client tokens after `/resource/get`

### WebSocket connection manager (`src/services/connection-manager.ts`)

- `saveConnection(connectionId, shareableContext, sessionId?)`: Stores WebSocket connection in DynamoDB
- `getConnection(connectionId)`: Retrieves connection data
- `deleteConnection(connectionId)`: Removes connection on disconnect
- `getConnectionsByChannel(channelId)`: Queries connections for broadcasting to a channel
- `getConnectionsByResourceId(type, id)`: Queries connections for a specific resource

### WebSocket client (`src/services/websocket-client.ts`)

- `sendToConnection(endpoint, connectionId, data)`: Send message to a specific connection
- `sendToConnections(endpoint, connectionIds[], data)`: Send to multiple connections
- `broadcast(endpoint, connectionIds[], data)`: Broadcast with stale connection handling
- `disconnect(endpoint, connectionId)`: Force disconnect a connection

## Utilities

### Logging (`src/utils/logger.ts`)

- Structured logs; pretty-prints when `IS_OFFLINE=true`, JSON logs otherwise
- `LOG_LEVEL` controls verbosity (error, warn, info, debug)

### HTTP response helpers (`src/utils/response.ts`)

- `success(result, statusCode?)` and `failure(message, statusCode?, error?)` return API Gateway HTTP response shapes

### WebSocket response helpers (`src/utils/ws-response.ts`)

- `wsSuccess(command, result?)`: Creates success WebSocket response
- `wsFailure(command, error)`: Creates error WebSocket response
- `handlerResponseToWs(command, handlerResponse)`: Converts HTTP `HandlerResponse` to WebSocket format
- `wsLambdaSuccess()` / `wsLambdaError(statusCode, message)`: Lambda responses for connection lifecycle events

### Event parsing and helpers (`src/utils/lib.ts`)

- `parseHttpEvent(event)`: extracts method/resource/action and safely parses JSON body
- `safeJson` handles base64 and malformed JSON; `getHeader` performs case-insensitive header lookups

## Types

- `src/types/agentifclo-types.ts`: DTOs used across handlers/services
- `src/types/shareable-context.ts`: `{ token, type, id, channels? }`
- `src/types/transient-context.ts`: ephemeral context
- `src/types/response-types.ts`: `PublicError` shape used in `failure()`
- `src/types/websocket-types.ts`: WebSocket message format, connection records, and response types
  - `WebSocketMessage`: Client message format with `command` field
  - `WebSocketResponse`: Server response format
  - `ConnectionRecord`: DynamoDB connection record schema
  - `WithWebSocket`: `RequestEvent` with guaranteed `websocketContext`

## Environment Variables Used by src/

- `AGENTICFLO_BASE_URL`: Base URL for Core API (required)
- `AGENTICFLO_BACKPLANE_TOKEN`: Backplane auth token for Core API (required)
- `AGENTICFLO_REQUEST_TIMEOUT`: Optional request timeout for Core API calls (ms)
- `AGENTICFLO_TLS_INSECURE`: `'1'|'true'|'yes'` to allow insecure TLS; only honored when `IS_OFFLINE` is also truthy
- `CLIENT_AUTH_SECRET`: Secret for signing and verifying transient client JWTs (required)
- `DEFAULT_CLIENT_AUTH_TTL`: Default auth token TTL (e.g., `'10m'`)
- `WS_CONNECTIONS_TABLE`: DynamoDB table name for WebSocket connections (auto-configured)
- `LOG_LEVEL`: error|warn|info|debug
- `STAGE`: dev|prod (affects logging behavior)
- `IS_OFFLINE`: `'true'` for serverless-offline pretty logging
- `OFFLINE_HTTP_PORT`: Local HTTP port (default: 6000)
- `OFFLINE_WS_PORT`: Local WebSocket port (default: 6001)

## Execution Flow at a Glance

### HTTP Flow

1. Client POSTs `/resource/get` with a shareable token in JSON body
2. `Handlers/resource.get` validates via Core API and returns `{ config, authToken }`
3. Client uses `authToken` as `Authorization: Bearer <token>` for subsequent calls
4. Authenticated endpoints (webchat, upload) execute via middleware-protected handlers
5. All responses standardized by `utils/response.ts`; errors surfaced as `{ success: false, message, error }`

### WebSocket Flow

1. Client connects to WebSocket URL: `ws://host` (no authentication required yet)
2. `$connect` handler accepts connection and stores unauthenticated connection in DynamoDB
3. **Client MUST send authenticate command as first message**:
   - `{ command: "authenticate", token: "SHAREABLE_TOKEN", sessionId: "optional" }`
   - Handler validates shareable token with backend (same as HTTP `/resource/get`)
   - Connection record is updated with auth context and resource configuration
4. Client sends JSON messages: `{ command: "resource:action", ...params }`
5. `$default` handler:
   - Retrieves connection from DynamoDB
   - Checks authentication status (except for `authenticate` command)
   - Parses `command` into `resource:action`
   - Creates `RequestEvent` with WebSocket context
   - Calls the **same handler** used by HTTP
   - Converts response and sends back via WebSocket
6. On disconnect, `$disconnect` handler removes connection from DynamoDB
7. All WebSocket responses: `{ success: true/false, command, result?, error? }`

## Adding a New Endpoint (pattern: /<resource>/<action>)

1. Create a new module under `src/handlers/<your-module>.ts` that exports your handler(s)
   - Handlers should accept `RequestEvent` (or `WithShareable`/`WithHttp`) and return `{ result }`
   - Throw `HttpCodedError(statusCode, message, code?)` for request errors

2. Wire the HTTP route in `src/http-router.ts` by adding an entry to `routingMap` under your resource
   - Example: `'reports': { 'POST:create': applyMiddleware(reportsModule.create, [jwtMiddleware]) }`

3. Wire the WebSocket route in `src/websocket-router.ts` by adding to `messageRoutingMap`
   - Example: `'reports:create': reportsModule.create as HandlerFn`
   - **Note**: Auth is checked automatically via `requireAuthentication` middleware for all commands except `authenticate`

4. Ensure `serverless.yml` routes include `/reports/create` and target the `httpRouter` function
   - WebSocket automatically handles all commands via `$default` route

5. If your route is public (HTTP), omit `jwtMiddleware`; otherwise include it
   - For WebSocket, public routes still work but auth happens at connection time

**That's it!** Your handler now works with both HTTP and WebSocket automatically.

## WebSocket Testing

### Local Testing

Start the development server:

```bash
npm run dev
```

This starts both:

- HTTP API: `http://localhost:6000`
- WebSocket API: `ws://localhost:6001`

### Using wscat

```bash
npm install -g wscat

# Connect (no auth required at connection time)
wscat -c "ws://localhost:6001"

# First message MUST be authenticate (with SHAREABLE token, not JWT)
> {"command":"authenticate","token":"YOUR_SHAREABLE_TOKEN"}
< {"success":true,"command":"authenticate","result":{"authenticated":true,"config":{...}}}

# Now you can send other commands
> {"command":"webchat:send","sessionId":"session-123","message":"Hello!"}
< {"success":true,"command":"webchat:send","result":{...}}
```

### Using JavaScript

```javascript
const ws = new WebSocket('ws://localhost:6001');

ws.onopen = () => {
  console.log('Connected! Authenticating...');

  // FIRST: Authenticate with SHAREABLE token (not JWT)
  ws.send(
    JSON.stringify({
      command: 'authenticate',
      token: 'YOUR_SHAREABLE_TOKEN', // This is the shareable token, NOT a JWT
      sessionId: 'session-123' // optional
    })
  );
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('Response:', response);

  // After successful authentication, you can send other commands
  if (response.command === 'authenticate' && response.success) {
    console.log('Authenticated! Sending message...');
    ws.send(
      JSON.stringify({
        command: 'webchat:get-history',
        sessionId: 'session-123'
      })
    );
  }
};

ws.onerror = (error) => console.error('Error:', error);
ws.onclose = () => console.log('Disconnected');
```

## Broadcasting Messages

To broadcast to multiple WebSocket connections:

```typescript
import { connectionManager } from './services/connection-manager';
import { websocketClient } from './services/websocket-client';
import { wsSuccess } from './utils/ws-response';

// Get all connections for a channel
const connections = await connectionManager.getConnectionsByChannel('channel-123');

// Broadcast message
const endpoint = process.env.IS_OFFLINE
  ? 'http://localhost:6001'
  : 'https://your-api-id.execute-api.us-east-1.amazonaws.com/dev';

await websocketClient.broadcast(
  endpoint,
  connections.map((c) => c.connectionId),
  wsSuccess('webchat:broadcast', { from: 'system', message: 'Server announcement!' })
);
```

## Notes for Future Developers

- **HTTP and WebSocket share handlers**: Any handler you write automatically works for both protocols
- The HTTP router expects a two-segment path (resource/action); keep `serverless.yml` paths aligned
- The WebSocket router expects `command: "resource:action"` format in messages
- Prefer returning slim DTOs from services; handlers should be thin translators between protocols and services
- Centralize cross-cutting concerns (auth, rate limiting, CORS, etc.) in middlewares to keep handlers simple
- Maintain consistent error propagation:
  - HTTP: Throw `HttpCodedError` in handlers/services
  - WebSocket: Throw `WebSocketError` for WebSocket-specific errors
- WebSocket connections are stateful; authentication happens via the first `authenticate` command and is cached in DynamoDB
- Clean up stale connections using DynamoDB TTL (auto-cleanup after 24 hours)
- **IMPORTANT**: WebSocket clients must send `authenticate` command before any other commands will be accepted
