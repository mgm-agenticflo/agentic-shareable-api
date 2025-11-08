# Agentic Shareables Middleware

This repository is a Serverless Framework project that exposes a single Lambda handler which performs in-process routing
to feature modules under `src/`. The goal is to act as a secure, minimal "backplane" between untrusted web clients and
the core API.

## Core Entrypoint

- **Function**: `handler` in `src/http-router.ts`
- **Declared in**: `serverless.yml` as `functions.httpRouter.handler`
- **Behavior**: Serverless (and serverless-offline) send all matching HTTP API routes to this handler, which then
  dispatches to internal handlers based on the request path and method

## How Routing Works (Read This First)

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

## Implemented Routes (as implemented by src/http-router.ts)

All responses follow `utils/response.ts` shapes: success => `{ success: true, result }`, error =>
`{ success: false, message, error }`.

### Public, no auth

- **POST /resource/get** → `src/handlers/resource.ts`, `resourceModule.get`
  - Body: `{ token: string }`
  - Returns: `{ config: ShareableContext, authToken: string }`
  - Generates a transient client JWT auth token for subsequent authenticated calls.

### Authenticated (Authorization: Bearer <authToken> from /resource/get)

- **POST /webchat/get-history** → `src/handlers/webchat.ts`, `webchatModule.getHistory`
  - Body: `{ sessionId: string }`
  - Returns: `ChatMessage[]` (conversation history)

- **POST /webchat/send** → `src/handlers/webchat.ts`, `webchatModule.send`
  - Body: `{ sessionId: string, message: string, ... }`
  - Returns: `ChatMessage` (created/processed message)

- **POST /upload/get-link** → `src/handlers/upload.ts`, `uploadModule.getUploadLink`
  - Body: `FileCreateDTO`
  - Returns: `SignedUrl { url, file }`

- **POST /upload/confirm** → `src/handlers/upload.ts`, `uploadModule.confirmUpload`
  - Body: `FileConfirmationDTO`
  - Returns: `FileDTO`

## Handlers and Middleware Structure

- Modules live under `src/handlers` and export functions that return `{ result, statusCode?, headers? }` (see
  `src/types/handler-types.ts`)
  - Handlers are small and delegate to services in `src/services`
  - Handlers should throw `HttpError` (`src/errors/http-error.ts`) for request/validation errors; http-router will
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
- Maps backend errors to frontend-safe `HttpError` values (status/message) before surfacing them to handlers

### Transient token service (`src/services/transient-token.ts`)

- `generate(payload, expiresIn?)` => JWT
- `verify(token)` => `ShareableContext | null`
- Used to mint short-lived client tokens after `/resource/get`

## Utilities

### Logging (`src/utils/logger.ts`)

- Structured logs; pretty-prints when `IS_OFFLINE=true`, JSON logs otherwise
- `LOG_LEVEL` controls verbosity (error, warn, info, debug)

### Response helpers (`src/utils/response.ts`)

- `success(result, statusCode?)` and `failure(message, statusCode?, error?)` return API Gateway response shapes

### Event parsing and helpers (`src/utils/lib.ts`)

- `parseHttpEvent(event)`: extracts method/resource/action and safely parses JSON body
- `safeJson` handles base64 and malformed JSON; `getHeader` performs case-insensitive header lookups

## Types

- `src/types/agentifclo-types.ts`: DTOs used across handlers/services
- `src/types/shareable-context.ts`: `{ token, type, id, channels? }`
- `src/types/transient-context.ts`: ephemeral context
- `src/types/response-types.ts`: `PublicError` shape used in `failure()`

## Environment Variables Used by src/

- `AGENTICFLO_BASE_URL`: Base URL for Core API (required)
- `AGENTICFLO_BACKPLANE_TOKEN`: Backplane auth token for Core API (required)
- `AGENTICFLO_REQUEST_TIMEOUT`: Optional request timeout for Core API calls (ms)
- `AGENTICFLO_TLS_INSECURE`: `'1'|'true'|'yes'` to allow insecure TLS; only honored when `IS_OFFLINE` is also truthy
- `CLIENT_AUTH_SECRET`: Secret for signing and verifying transient client JWTs
- `DEFAULT_TRANSIENT_TTL`: Default auth token TTL (e.g., `'10m'`)
- `LOG_LEVEL`: error|warn|info|debug
- `STAGE`: dev|prod (affects logging behavior)
- `IS_OFFLINE`: `'true'` for serverless-offline pretty logging

## Execution Flow at a Glance

1. Client POSTs `/resource/get` with a shareable token in JSON body
2. `Handlers/resource.get` validates via Core API and returns `{ config, authToken }`
3. Client uses `authToken` as `Authorization: Bearer <token>` for subsequent calls
4. Authenticated endpoints (webchat, upload) execute via middleware-protected handlers
5. All responses standardized by `utils/response.ts`; errors surfaced as `{ success: false, message, error }`

## Adding a New Endpoint (pattern: /<resource>/<action>)

1. Create a new module under `src/handlers/<your-module>.ts` that exports your handler(s)
   - Handlers should accept `RequestEvent` (or `WithShareable`/`WithHttp`) and return `{ result }`
   - Throw `HttpError(statusCode, message, code?)` for request errors

2. Wire the route in `src/http-router.ts` by adding an entry to `routingMap` under your resource
   - Example: `'reports': { 'POST:create': applyMiddleware(reportsModule.create, [jwtMiddleware]) }`

3. Ensure `serverless.yml` routes include `/reports/create` and target the same Lambda function (`httpRouter`)

4. If your route is public, omit `jwtMiddleware`; otherwise include it

## Notes for Future Developers

- The router expects a two-segment path (resource/action) for non-trivial operations; keep `serverless.yml` paths
  aligned
- Prefer returning slim DTOs from services; handlers should be thin translators between HTTP and services
- Centralize cross-cutting concerns (auth, rate limiting, CORS, etc.) in middlewares to keep handlers simple
- Maintain consistent error propagation by throwing `HttpError` in handlers/services and letting the router format the
  response
