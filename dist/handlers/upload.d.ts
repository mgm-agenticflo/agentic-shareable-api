import { CoreApiService } from '../services/core-api';
import { WithShareable } from '../types/request-types';
export declare const CreateUploadModule: (coreApi: CoreApiService) => {
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
    getUploadLink: (event: WithShareable) => Promise<{
        result: import("../types/agentifclo-types").SignedUrl | undefined;
    }>;
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
    confirmUpload: (event: WithShareable) => Promise<{
        result: import("../types/agentifclo-types").FileDTO | undefined;
    }>;
};
export type UploadModule = ReturnType<typeof CreateUploadModule>;
export declare const uploadModule: {
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
    getUploadLink: (event: WithShareable) => Promise<{
        result: import("../types/agentifclo-types").SignedUrl | undefined;
    }>;
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
    confirmUpload: (event: WithShareable) => Promise<{
        result: import("../types/agentifclo-types").FileDTO | undefined;
    }>;
};
//# sourceMappingURL=upload.d.ts.map