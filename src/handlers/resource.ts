import { HttpStatusCode } from 'axios';
import { HttpError } from '../errors/http-error';
import { coreApi, CoreApiService } from '../services/core-api';
import { tokenService, TransientTokenService } from '../services/transient-token';
import { ResourceRequest, WithHttp } from '../types/request-types';

export const CreateResourceModule = (coreApi: CoreApiService, tokenService: TransientTokenService) => ({
  get: async (event: WithHttp) => {
    const { token } = event.parsedBody as ResourceRequest;

    if (!token) {
      throw new HttpError(HttpStatusCode.BadRequest, 'Token is required');
    }

    // Get resource configuration (includes validation)
    const shareable = await coreApi.getConfiguration(token);
    if (!shareable) {
      throw new HttpError(HttpStatusCode.BadRequest, 'Invalid or expired resource');
    }

    // Generate client transient token
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
