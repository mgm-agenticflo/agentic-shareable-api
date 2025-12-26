import { CoreApiService } from '../services/core-api';
import { TransientTokenService } from '../services/transient-token';
import { WithHttp } from '../types/request-types';
export declare const CreateResourceModule: (coreApi: CoreApiService, tokenService: TransientTokenService) => {
    /**
     * Retrieves a shareable resource configuration and generates an authentication token.
     *
     * This endpoint validates the provided resource token, fetches the associated configuration,
     * and creates a transient client authentication token for accessing the resource.
     *
     * @param event - The HTTP event containing the parsed request body
     * @returns An object containing:
     *   - config: The shareable resource configuration
     *   - authToken: A transient token for client authentication
     *
     * @throws {HttpCodedError} 400 - If token is missing from the request
     * @throws {HttpCodedError} 400 - If the token is invalid or expired
     *
     * @example
     * // Request body: { token: "abc123" }
     * // Returns: { result: { config: {...}, authToken: "xyz789" } }
     */
    get: (event: WithHttp) => Promise<{
        result: {
            config: import("../types/shareable-context").ShareableContext;
            authToken: string;
        };
    }>;
};
export type ResourceModule = ReturnType<typeof CreateResourceModule>;
export declare const resourceModule: {
    /**
     * Retrieves a shareable resource configuration and generates an authentication token.
     *
     * This endpoint validates the provided resource token, fetches the associated configuration,
     * and creates a transient client authentication token for accessing the resource.
     *
     * @param event - The HTTP event containing the parsed request body
     * @returns An object containing:
     *   - config: The shareable resource configuration
     *   - authToken: A transient token for client authentication
     *
     * @throws {HttpCodedError} 400 - If token is missing from the request
     * @throws {HttpCodedError} 400 - If the token is invalid or expired
     *
     * @example
     * // Request body: { token: "abc123" }
     * // Returns: { result: { config: {...}, authToken: "xyz789" } }
     */
    get: (event: WithHttp) => Promise<{
        result: {
            config: import("../types/shareable-context").ShareableContext;
            authToken: string;
        };
    }>;
};
//# sourceMappingURL=resource.d.ts.map