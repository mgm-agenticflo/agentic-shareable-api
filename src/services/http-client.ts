import axios, { AxiosError, AxiosInstance, HttpStatusCode, InternalAxiosRequestConfig } from 'axios';
import https from 'node:https';
import { HttpCodedError } from '../errors/http-error';
import { getErrorMessage, isTrue } from '../utils/lib';
import logger from '../utils/logger';

/**
 * Default timeout for HTTP requests in milliseconds.
 */
const DEFAULT_REQUEST_TIMEOUT = 30000;

/**
 * Singleton instance of the HTTP client.
 * Initialized on first call to getHttpClient().
 */
let httpClient: AxiosInstance | null = null;

/**
 * Configuration options for creating an HTTP client instance.
 */
export interface HttpClientConfig {
  /** Base URL for all API requests */
  baseURL: string;
  /** Request timeout in milliseconds (defaults to DEFAULT_REQUEST_TIMEOUT) */
  timeout?: number;
  /** Authentication token to be included in the Authorization header */
  authToken: string;
  /** Additional custom headers to include with every request */
  headers?: Record<string, string>;
  /** If true, disables TLS certificate validation (use only in development) */
  insecureTLS?: boolean;
}

/**
 * Creates an HTTPS agent with optional insecure TLS settings.
 *
 * @param opts - Configuration options
 * @param opts.insecureTLS - If true, creates an agent that doesn't validate certificates
 * @returns HTTPS agent instance or undefined if not needed
 * @internal
 */
function buildHttpsAgent(opts: { insecureTLS?: boolean }) {
  if (opts.insecureTLS) {
    return new https.Agent({ rejectUnauthorized: false });
  }
  return undefined;
}

/**
 * Maps backend Axios errors to frontend-friendly HttpCodedError instances.
 *
 * This function sanitizes error messages to prevent leaking sensitive information
 * while preserving the original backend message for debugging purposes.
 *
 * @param error - Axios error from the backend request
 * @returns Mapped HttpCodedError with appropriate status code and user-friendly message
 * @internal
 */
function mapBackendErrorToFrontend(error: AxiosError): HttpCodedError {
  const statusCode = error.response?.status || 0;
  const backendMessage = getErrorMessage(error);

  switch (statusCode) {
    case 401:
    case 403:
      // Don't leak authentication/authorization details
      return new HttpCodedError(HttpStatusCode.BadRequest, 'Invalid or expired token', { backendMessage });

    case 404:
      return new HttpCodedError(HttpStatusCode.BadRequest, 'Resource not found', { backendMessage });

    case 429:
      return new HttpCodedError(HttpStatusCode.TooManyRequests, 'Too many requests', { backendMessage });

    case 500:
    case 502:
    case 503:
      return new HttpCodedError(HttpStatusCode.ServiceUnavailable, 'Service temporarily unavailable', {
        backendMessage
      });

    default:
      // Generic error for all other backend errors
      return new HttpCodedError(HttpStatusCode.InternalServerError, 'Service error', { backendMessage });
  }
}

/**
 * Creates a configured Axios HTTP client instance with interceptors for logging and error handling.
 *
 * The client includes:
 * - Automatic Bearer token authentication
 * - Request/response logging
 * - Consistent error mapping and handling
 * - Optional insecure TLS for development environments
 *
 * @param config - HTTP client configuration options
 * @returns Configured Axios instance ready for making API requests
 *
 * @example
 * ```typescript
 * const client = createHttpClient({
 *   baseURL: 'https://api.example.com',
 *   authToken: 'your-token-here',
 *   timeout: 5000
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
 * Returns a singleton HTTP client instance configured from environment variables.
 *
 * Creates the client on first call and caches it for subsequent calls.
 * Configuration is loaded from the following environment variables:
 * - `AGENTICFLO_BASE_URL` (required): Base URL for API requests
 * - `AGENTICFLO_BACKPLANE_TOKEN` (required): Authentication token
 * - `AGENTICFLO_REQUEST_TIMEOUT` (optional): Request timeout in milliseconds
 * - `AGENTICFLO_TLS_INSECURE` (optional): Set to '1', 'true', or 'yes' to disable TLS validation
 * - `IS_OFFLINE` (optional): Must also be truthy for insecure TLS to be enabled
 *
 * @returns Singleton Axios instance configured for the application
 * @throws Error if required environment variables (AGENTICFLO_BASE_URL or AGENTICFLO_BACKPLANE_TOKEN) are not set
 *
 * @example
 * ```typescript
 * const client = getHttpClient();
 * const response = await client.get('/api/endpoint');
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

    const insecureTLS = isTrue(process.env.AGENTICFLO_TLS_INSECURE) && isTrue(process.env.IS_OFFLINE);

    httpClient = createHttpClient({
      baseURL,
      authToken,
      timeout,
      insecureTLS
    });
  }

  return httpClient;
}
