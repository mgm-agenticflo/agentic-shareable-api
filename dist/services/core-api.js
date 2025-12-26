import logger from '../utils/logger';
import { getHttpClient } from './http-client';
/**
 * Creates a Core API service instance with methods for interacting with the backend API.
 *
 * This service handles all core API operations including:
 * - Configuration retrieval
 * - Webchat messaging and history
 * - File upload workflows
 *
 * @param client - Axios instance used for making HTTP requests
 * @returns Object containing API service methods
 */
export const CreateCoreApiService = (client) => ({
    /**
     * Retrieves the shareable configuration context using a shareable token.
     *
     * @param shareableToken - Token used to authenticate and identify the shareable resource
     * @returns Promise resolving to the ShareableContext, or undefined if not found
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    getConfiguration: async (shareableToken) => {
        const headers = {
            'x-shareable-token': shareableToken
        };
        const response = await client.get(`/shareable`, { headers });
        if (!response.data.success) {
            throw new Error(`Failed to fetch resource: ${response.data.message}`);
        }
        return response.data.result;
    },
    /**
     * Sends a message to the webchat session.
     *
     * @param sessionId - Unique identifier for the webchat session
     * @param payload - Message payload containing the message text and optional additional data
     * @param shareableToken - Token used to authenticate the request
     * @returns Promise resolving to the created ChatMessage, or undefined if creation failed
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    sendWebchatMessage: async (sessionId, payload, shareableToken) => {
        const headers = {
            'x-shareable-token': shareableToken
        };
        const response = await client.post(`/webchat/${sessionId}`, payload, { headers });
        if (!response.data.success) {
            throw new Error(`Failed to send webchat message: ${response.data.message}`);
        }
        return response.data.result;
    },
    /**
     * Retrieves the complete message history for a webchat session.
     *
     * @param sessionId - Unique identifier for the webchat session
     * @param shareableToken - Token used to authenticate the request
     * @returns Promise resolving to an array of ChatMessages (empty array if no history exists)
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    getWebchatHistory: async (sessionId, shareableToken) => {
        const headers = {
            'x-shareable-token': shareableToken
        };
        const response = await client.get(`/webchat/history/${sessionId}`, { headers });
        if (!response.data.success) {
            throw new Error(`Failed to fetch webchat history: ${response.data.message}`);
        }
        const messages = response.data.result?.messages || [];
        return messages;
    },
    /**
     * Requests a presigned URL for uploading a file to cloud storage.
     *
     * This is the first step in the file upload process. The returned URL can be used
     * to directly upload the file to the storage service.
     *
     * @param fileCreate - File metadata including name, size, type, etc.
     * @param shareableToken - Token used to authenticate the request
     * @returns Promise resolving to SignedUrl details, or undefined if the request fails
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    getPresignedUploadUrl: async (fileCreate, shareableToken) => {
        const headers = {
            'x-shareable-token': shareableToken
        };
        const response = await client.post(`/upload/get-link`, fileCreate, { headers });
        if (!response.data.success) {
            throw new Error(`Failed to fetch upload link: ${response.data.message}`);
        }
        const details = response.data.result;
        if (!details) {
            logger.error('Unexpected empty response', response.data);
            return;
        }
        const { url, file } = details;
        return {
            url,
            file: {
                name: file.name,
                mime: file.mime,
                size: file.size,
                virtualPath: file.virtualPath,
                hash: file.hash
            }
        };
    },
    /**
     * Confirms that a file upload has been completed successfully.
     *
     * This should be called after the file has been uploaded to the presigned URL
     * to notify the backend that the upload is complete and ready for processing.
     *
     * @param fileCreate - File confirmation data including upload metadata
     * @param shareableToken - Token used to authenticate the request
     * @returns Promise resolving to SignedUrl details, or undefined if confirmation fails
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    confirmFileUpload: async (fileCreate, shareableToken) => {
        const headers = {
            'x-shareable-token': shareableToken
        };
        const response = await client.post(`/upload/confirm`, fileCreate, { headers });
        if (!response.data.success && !response.data.result) {
            throw new Error(`Failed to confirm upload: ${response.data.message}`);
        }
        const details = response.data.result;
        if (!details) {
            logger.error('Unexpected empty response', response.data);
            return;
        }
        return {
            name: details.name,
            mime: details.mime,
            size: details.size,
            virtualPath: details.virtualPath,
            hash: details.hash
        };
    }
});
export const coreApi = CreateCoreApiService(getHttpClient());
//# sourceMappingURL=core-api.js.map