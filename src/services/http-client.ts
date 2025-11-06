/**
 * HTTP client factory for backend communication.
 *
 * Provides a configured axios instance with standardized settings
 * for timeout, headers, and error handling.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import logger from '../utils/logger';
import { HttpError } from '../errors/http-error';
import { getErrorMessage } from '../utils/lib';
import https from 'node:https';

const DEFAULT_REQUEST_TIMEOUT = 10000;

/**
 * Singleton http client instance.
 * Initialized lazily on first access.
 */
let httpClient: AxiosInstance | null = null;

/**
 * Configuration options for the HTTP client
 */
export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  authToken: string;
  headers?: Record<string, string>;
  insecureTLS?: boolean;
}

function buildHttpsAgent(opts: { insecureTLS?: boolean }) {
  if (opts.insecureTLS) {
    return new https.Agent({ rejectUnauthorized: false });
  }
  return undefined;
}

/**
 * Maps backend HTTP errors to frontend-appropriate errors
 *
 * @param error
 * @returns
 */
function mapBackendErrorToFrontend(error: AxiosError): HttpError {
  const statusCode = error.response?.status || 0;
  const backendMessage = getErrorMessage(error);

  switch (statusCode) {
    case 401:
    case 403:
      // Don't leak authentication/authorization details
      return new HttpError(400, 'Invalid or expired token', { backendMessage });

    case 404:
      return new HttpError(400, 'Resource not found', { backendMessage });

    case 429:
      return new HttpError(429, 'Too many requests', { backendMessage });

    case 500:
    case 502:
    case 503:
      return new HttpError(503, 'Service temporarily unavailable', { backendMessage });

    default:
      // Generic error for all other backend errors
      return new HttpError(500, 'Service error', { backendMessage });
  }
}

/**
 * Creates a configured axios instance for http communication.
 *
 * Features:
 * - Request/response logging
 * - Automatic error transformation
 * - Configurable timeout and headers
 *
 * @param config - Client configuration options
 * @returns Configured axios instance
 *
 * @example
 * ```typescript
 * const client = createHttpClient({
 *   baseURL: process.env.AGENTICFLO_BASE_URL!,
 *   timeout: DEFAULT_REQUEST_TIMEOUT
 * });
 * ```
 */
export function createHttpClient(config: HttpClientConfig): AxiosInstance {
  const isHttps = config.baseURL.startsWith('https://');
  const httpsAgent = isHttps ? buildHttpsAgent({ insecureTLS: config.insecureTLS }) : undefined;

  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? DEFAULT_REQUEST_TIMEOUT,
    httpsAgent,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.authToken}`,
      ...config.headers
    }
  });

  // Request interceptor for logging
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      logger.debug('HTTP Request', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL
      });
      return config;
    },
    (error: AxiosError) => {
      logger.error('HTTP Request Error', error);
      const mappedError = mapBackendErrorToFrontend(error);
      return Promise.reject(mappedError);
    }
  );

  // Response interceptor for logging and error handling
  client.interceptors.response.use(
    (response) => {
      logger.debug('HTTP Response', {
        status: response.status,
        url: response.config.url
      });
      return response;
    },
    (error: AxiosError) => {
      const status = error.response?.status;
      const url = error.config?.url;

      logger.error('HTTP Response Error', error, {
        status,
        url,
        data: error.response?.data
      });

      const mappedError = mapBackendErrorToFrontend(error);
      return Promise.reject(mappedError);
    }
  );

  return client;
}

/**
 * Gets or creates the http client instance.
 *
 * @returns Configured axios instance for Core API
 * @throws Error if AGENTICFLO_BASE_URL environment variable is not set
 *
 * @example
 * ```typescript
 * const client = getHttpClient();
 * const response = await client.get('/shareable/validate/token123');
 * ```
 */
export function getHttpClient(): AxiosInstance {
  if (!httpClient) {
    const baseURL = process.env.AGENTICFLO_BASE_URL;
    const authToken = process.env.AGENTICFLO_BACKPLANE_TOKEN;
    const parsed = Number(process.env.AGENTICFLO_REQUEST_TIMEOUT);
    const timeout = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_TIMEOUT;

    if (!baseURL) {
      throw new Error('AGENTICFLO_BASE_URL environment variable is not set');
    }

    if (!authToken) {
      throw new Error('AGENTICFLO_BACKPLANE_TOKEN environment variable is not set');
    }

    const insecureTLS =
      ['1', 'true', 'yes'].includes(String(process.env.AGENTICFLO_TLS_INSECURE).toLowerCase()) &&
      ['1', 'true', 'yes'].includes(String(process.env.IS_OFFLINE).toLowerCase());

    httpClient = createHttpClient({
      baseURL,
      authToken,
      timeout,
      insecureTLS
    });
  }

  return httpClient;
}
