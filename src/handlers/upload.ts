import { coreApi, CoreApiService } from '../services/core-api';
import { FileConfirmationDTO, FileCreateDTO } from '../types/agentifclo-types';
import { WithShareable } from '../types/request-types';

export const CreateUploadModule = (coreApi: CoreApiService) => ({
  /**
   * Generates a presigned URL for uploading a file to the shareable resource.
   *
   * This endpoint creates a temporary upload link that allows clients to directly
   * upload files to storage without passing the file data through the API server.
   *
   * @param event - The HTTP event containing the shareable context and file metadata
   * @returns An object containing the presigned upload URL and related metadata
   *
   * @example
   * // Request body: { name: "document.pdf", size: 1024, mime: "application/pdf", hash: "..." }
   * // Returns: { result: { url: "https://...", file: {...} } }
   */
  getUploadLink: async (event: WithShareable) => {
    const payload = event.parsedBody as FileCreateDTO;
    const result = await coreApi.getPresignedUploadUrl(payload, event.shareableContext.token);
    return { result };
  },

  /**
   * Confirms successful file upload and finalizes the file record.
   *
   * After the client completes uploading to the presigned URL, this endpoint
   * verifies the upload and updates the file's status in the system.
   *
   * @param event - The HTTP event containing the shareable context and upload confirmation details
   * @returns An object containing the confirmed file information
   *
   * @example
   * // Request body: { link: "/Uploads/..." }
   * // Returns: { result: { name: "file.txt", status: "uploaded" } }
   */
  confirmUpload: async (event: WithShareable) => {
    const payload = event.parsedBody as FileConfirmationDTO;
    const result = await coreApi.confirmFileUpload(payload, event.shareableContext.token);
    return { result };
  }
});

export type UploadModule = ReturnType<typeof CreateUploadModule>;
export const uploadModule = CreateUploadModule(coreApi);
