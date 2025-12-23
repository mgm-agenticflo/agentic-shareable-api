import { HttpStatusCode } from 'axios';
import type { IncomingMessage } from 'http';
import https from 'https';
import { HttpCodedError } from '../errors/http-error';
import { RequestEvent } from '../types/request-types';
import { getHeader } from '../utils/lib';
import logger from '../utils/logger';

export type ErrorNotificationData = {
  environment: string;
  errorJson: Record<string, unknown>;
  stacktrace: string;
  endpoint: string;
  method: string;
  payload: unknown;
  timestamp: string;
  clientInfo: {
    origin?: string;
    ip?: string;
    token?: string;
    userAgent?: string;
    requestId?: string;
  };
};

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Checks if an error is a 401 error from the core API that has already been retried.
 *
 * These errors are mapped to HttpCodedError with statusCode 400 and message
 * "Invalid or expired token" after retries are exhausted.
 *
 * This function is intentionally strict to ensure ONLY retried 401 errors from
 * the core API are filtered. All other errors (timeouts, network errors, 5xx, etc.)
 * should be sent to Slack even if they were retried.
 *
 * @param error - The error to check
 * @returns True if the error is a retried 401 from the core API, false otherwise
 */
function isRetriedCoreApi401Error(error: unknown): boolean {
  if (!(error instanceof HttpCodedError)) {
    return false;
  }

  if (error.name !== 'HttpCodedError') {
    return false;
  }

  if (error.statusCode !== (HttpStatusCode.BadRequest as number)) {
    return false;
  }

  if (error.message !== 'Invalid or expired token') {
    return false;
  }

  if (!error.details || typeof error.details !== 'object') {
    return false;
  }

  if (!('backendMessage' in error.details)) {
    return false;
  }

  const backendMessage = error.details.backendMessage;
  if (typeof backendMessage !== 'string' || backendMessage.trim().length === 0) {
    return false;
  }

  return true;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const errorObj: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    if ('statusCode' in error) {
      errorObj.statusCode = (error as { statusCode: unknown }).statusCode;
    }

    if ('code' in error) {
      errorObj.code = (error as { code: unknown }).code;
    }

    if ('details' in error) {
      errorObj.details = (error as { details: unknown }).details;
    }

    return errorObj;
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }

  return { message: 'Unknown error occurred' };
}

export function extractErrorData(
  requestEvent: RequestEvent | null,
  error: unknown,
  additionalContext?: Record<string, unknown>
): ErrorNotificationData {
  const environment = process.env.STAGE || 'dev';
  const timestamp = new Date().toISOString();
  const errorJson = serializeError(error);
  const stacktrace = error instanceof Error ? error.stack || 'No stack trace available' : 'No stack trace available';

  let endpoint = 'unknown';
  let method = 'UNKNOWN';
  let payload: unknown = null;
  let clientInfo: ErrorNotificationData['clientInfo'] = {};

  if (requestEvent) {
    const { targetResource, parsedBody, httpContext, websocketContext } = requestEvent;

    method = targetResource.method || 'UNKNOWN';
    const resource = targetResource.resource || 'unknown';
    const action = targetResource.action || '';
    endpoint = action ? `${resource}/${action}` : resource;

    payload = parsedBody;

    if (httpContext) {
      const headers = httpContext.headers || {};
      const requestContext = httpContext.requestContext;

      clientInfo = {
        ip: requestContext?.http?.sourceIp,
        origin: getHeader(headers, 'origin'),
        userAgent: getHeader(headers, 'user-agent'),
        token: (() => {
          const authHeader = getHeader(headers, 'authorization');
          if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
          }
          return authHeader;
        })(),
        requestId: requestContext?.requestId
      };
    } else if (websocketContext) {
      const requestContext = websocketContext.requestContext;

      clientInfo = {
        requestId: requestContext?.requestId || requestContext?.connectionId
      };
    }
  }

  if (additionalContext) {
    clientInfo = { ...clientInfo, ...additionalContext };
  }

  return {
    environment,
    errorJson,
    stacktrace,
    endpoint,
    method,
    payload,
    timestamp,
    clientInfo
  };
}

function formatSlackMessage(errorData: ErrorNotificationData): Record<string, unknown> {
  const { environment, errorJson, stacktrace, endpoint, method, payload, timestamp, clientInfo } = errorData;

  const errorMessage = (errorJson.message as string) || 'Unknown error';
  const errorType = (errorJson.name as string) || 'Error';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `[Shareable API] 🚨 Error in ${environment.toUpperCase()}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Environment:*\n${environment}`
        },
        {
          type: 'mrkdwn',
          text: `*Timestamp:*\n${timestamp}`
        },
        {
          type: 'mrkdwn',
          text: `*Error Type:*\n${errorType}`
        },
        {
          type: 'mrkdwn',
          text: `*Endpoint:*\n${method} ${endpoint}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Error Message:*\n\`\`\`${errorMessage}\`\`\``
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Stacktrace:*\n\`\`\`${stacktrace.substring(0, 2000)}\`\`\``
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Client IP:*\n${clientInfo.ip || 'N/A'}`
        },
        {
          type: 'mrkdwn',
          text: `*Origin:*\n${clientInfo.origin || 'N/A'}`
        },
        {
          type: 'mrkdwn',
          text: `*User-Agent:*\n${clientInfo.userAgent || 'N/A'}`
        },
        {
          type: 'mrkdwn',
          text: `*Token:*\n${clientInfo.token ? `${clientInfo.token.substring(0, 10)}...` : 'N/A'}`
        }
      ]
    }
  ];

  if (payload && typeof payload === 'object' && Object.keys(payload as Record<string, unknown>).length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Request Payload:*\n\`\`\`${JSON.stringify(payload, null, 2).substring(0, 1000)}\`\`\``
      }
    });
  }

  if (Object.keys(errorJson).length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Full Error JSON:*\n\`\`\`${JSON.stringify(errorJson, null, 2).substring(0, 1000)}\`\`\``
      }
    });
  }

  return {
    blocks
  };
}

function sendSlackNotification(webhookUrl: string, errorData: ErrorNotificationData): Promise<void> {
  return new Promise((resolve, reject) => {
    const message = formatSlackMessage(errorData);

    const payload = JSON.stringify(message);

    const url = new URL(webhookUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res: IncomingMessage) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`Slack webhook returned status ${res.statusCode || 'unknown'}`));
      }
      res.on('end', () => {});
    });

    req.on('error', (error: Error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

export function notifySlackAsync(errorData: ErrorNotificationData): void {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn('SLACK_WEBHOOK_URL not configured, skipping error notification');
    return;
  }

  sendSlackNotification(SLACK_WEBHOOK_URL, errorData).catch((error) => {
    logger.error('Failed to send Slack notification', error);
  });
}

/**
 * Checks if an error should be sent to Slack.
 *
 * Filters out 401 errors from the core API that have already been retried,
 * as these are expected and handled automatically.
 *
 * @param error - The error to check
 * @returns True if the error should be sent to Slack, false otherwise
 */
export function shouldNotifySlack(error: unknown): boolean {
  return !isRetriedCoreApi401Error(error);
}
