# Agentic Shareables Middleware

A serverless middleware API for managing shareable token communication between web pages and the core API. This service acts as a secure gateway to prevent direct API abuse.

## Features

- **Token Validation**: Validates shareable tokens with origin checking for webchat tokens
- **Resource Access**: Secure access to assistant and integration resources
- **Action Execution**: Execute allowed actions on resources with rate limiting
- **Origin Validation**: Validates request origins for webchat tokens
- **Rate Limiting**: Basic rate limiting to prevent abuse
- **Data Filtering**: Filters sensitive data from API responses

## API Endpoints

### Validate Token
```
GET /validate/{token}
```
Validates a shareable token and returns resource information.

### Get Resource
```
GET /resource/{token}
```
Retrieves filtered resource data for the given token.

### Execute Action
```
POST /action/{token}
```
Executes an action on the resource associated with the token.

**Request Body:**
```json
{
  "action": "chat|config|authenticate|status",
  "payload": {}
}
```

## Supported Resource Types

### Assistant (Webchat)
- **Actions**: `chat`, `config`
- **Origin Validation**: Required
- **Rate Limiting**: 100 requests/minute per token

### Integration
- **Actions**: `authenticate`, `status`
- **Origin Validation**: Not required
- **Rate Limiting**: 100 requests/minute per token

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Deploy to AWS:
   ```bash
   npm run deploy
   ```

## Environment Variables

- `CORE_API_URL`: URL of the core AgenticFlo API
- `JWT_SECRET`: Secret for JWT token validation

## Security Features

- Origin validation for webchat tokens
- Rate limiting per token and action
- Data filtering to prevent sensitive information exposure
- Token expiration and revocation checking
- Action allowlist per resource type

## Error Codes

- `MISSING_TOKEN`: Token parameter is required
- `INVALID_TOKEN`: Token is invalid, expired, or revoked
- `INVALID_ORIGIN`: Request origin not allowed for this token
- `MISSING_ACTION`: Action parameter is required
- `ACTION_NOT_ALLOWED`: Action not permitted for resource type
- `RATE_LIMITED`: Too many requests
- `RESOURCE_NOT_FOUND`: Resource not accessible
- `ACCESS_DENIED`: Access to resource denied
- `EXECUTION_ERROR`: Action execution failed