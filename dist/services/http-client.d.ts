import { AxiosInstance } from 'axios';
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
export declare function createHttpClient(config: HttpClientConfig): AxiosInstance;
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
export declare function getHttpClient(): AxiosInstance;
//# sourceMappingURL=http-client.d.ts.map