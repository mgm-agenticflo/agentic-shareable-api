import { HttpStatusCode } from 'axios';
import { HttpCodedError } from '../errors/http-error';
import { coreApi, CoreApiService } from '../services/core-api';
import { tokenService, TransientTokenService } from '../services/transient-token';
import { ResourceRequest, WithHttp } from '../types/request-types';

export const CreateResourceModule = (coreApi: CoreApiService, tokenService: TransientTokenService) => ({
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
  get: async (event: WithHttp) => {
    const { token } = event.parsedBody as ResourceRequest;

    if (!token) {
      throw new HttpCodedError(HttpStatusCode.BadRequest, 'Token is required');
    }

    // Fetch and validate the resource configuration
    const shareable = await coreApi.getConfiguration(token);
    if (!shareable) {
      throw new HttpCodedError(HttpStatusCode.BadRequest, 'Invalid or expired resource');
    }

    // Generate a transient authentication token for the client
    const authToken = tokenService.generate(shareable);

    const result = {
      config: shareable,
      authToken
    };

    return { result };
  }
});

export type ResourceModule = ReturnType<typeof CreateResourceModule>;
export const resourceModule = CreateResourceModule(coreApi, tokenService);
