import { coreApi, CoreApiService } from '../services/core-api';
import { FileConfirmationDTO, FileCreateDTO } from '../types/agentifclo-types';
import { WithShareable } from '../types/request-types';

export const CreateUploadModule = (coreApi: CoreApiService) => ({
  getUploadLink: async (event: WithShareable) => {
    const payload = event.parsedBody as FileCreateDTO;
    const result = await coreApi.getPresignedUploadUrl(payload, event.shareableContext.token);
    return { result };
  },

  confirmUpload: async (event: WithShareable) => {
    const payload = event.parsedBody as FileConfirmationDTO;
    const result = await coreApi.confirmFileUpload(payload, event.shareableContext.token);
    return { result };
  }
});

export type UploadModule = ReturnType<typeof CreateUploadModule>;
export const uploadModule = CreateUploadModule(coreApi);
