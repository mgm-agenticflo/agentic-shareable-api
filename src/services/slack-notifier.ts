import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import type { IncomingMessage } from 'http';
import logger from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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


export function notifySlackAsync(errorData: ErrorNotificationData): void {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn('SLACK_WEBHOOK_URL not configured, skipping error notification');
    return;
  }

  try {
    const workerPath = join(__dirname, 'slack-worker.js');
    const worker = new Worker(workerPath, {
      workerData: {
        webhookUrl: SLACK_WEBHOOK_URL,
        errorData
      }
    });

    worker.on('error', (error) => {
      logger.error('Slack notification worker error', error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn(`Slack notification worker exited with code ${code}`);
      }
    });
  } catch (error) {
    logger.error('Failed to create Slack notification worker', error);
  }
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
        text: `🚨 Error in ${environment.toUpperCase()}`,
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

  if (payload && Object.keys(payload as Record<string, unknown>).length > 0) {
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

export function sendSlackNotification(webhookUrl: string, errorData: ErrorNotificationData): Promise<void> {
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

