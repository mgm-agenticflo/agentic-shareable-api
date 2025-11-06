import { HttpError } from '../errors/http-error';
import { coreApi, CoreApiService } from '../services/core-api';
import { tokenService, TransientTokenService } from '../services/transient-token';
import { ParsedRequestContext, RequestEvent } from '../types/request-types';

export const CreateResourceModule = (coreApi: CoreApiService, tokenService: TransientTokenService) => ({
  get: async (_event: RequestEvent, context: ParsedRequestContext) => {
    const shareableToken = context.pathParams?.token;

    if (!shareableToken) {
      throw new HttpError(400, 'Token is required');
    }

    // Get resource configuration (includes validation)
    const shareable = await coreApi.getConfiguration(shareableToken);
    if (!shareable) {
      throw new HttpError(400, 'Invalid or expired resource');
    }

    // Generate client transient token
    const authToken = tokenService.generate(shareable);

    return {
      config: shareable,
      authToken
    };
  }
});

export type ResourecModule = ReturnType<typeof CreateResourceModule>;
export const resourceModule = CreateResourceModule(coreApi, tokenService);
