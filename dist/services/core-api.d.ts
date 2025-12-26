import { AxiosInstance } from 'axios';
import { ShareableContext } from '../types/shareable-context';
import { ChatMessage, FileConfirmationDTO, FileCreateDTO, FileDTO, SignedUrl } from '../types/agentifclo-types';
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
export declare const CreateCoreApiService: (client: AxiosInstance) => {
    /**
     * Retrieves the shareable configuration context using a shareable token.
     *
     * @param shareableToken - Token used to authenticate and identify the shareable resource
     * @returns Promise resolving to the ShareableContext, or undefined if not found
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    getConfiguration: (shareableToken: string) => Promise<ShareableContext | undefined>;
    /**
     * Sends a message to the webchat session.
     *
     * @param sessionId - Unique identifier for the webchat session
     * @param payload - Message payload containing the message text and optional additional data
     * @param shareableToken - Token used to authenticate the request
     * @returns Promise resolving to the created ChatMessage, or undefined if creation failed
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    sendWebchatMessage: (sessionId: string, payload: {
        message: string;
        [key: string]: unknown;
    }, shareableToken: string) => Promise<ChatMessage | undefined>;
    /**
     * Retrieves the complete message history for a webchat session.
     *
     * @param sessionId - Unique identifier for the webchat session
     * @param shareableToken - Token used to authenticate the request
     * @returns Promise resolving to an array of ChatMessages (empty array if no history exists)
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    getWebchatHistory: (sessionId: string, shareableToken: string) => Promise<ChatMessage[]>;
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
    getPresignedUploadUrl: (fileCreate: FileCreateDTO, shareableToken: string) => Promise<SignedUrl | undefined>;
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
    confirmFileUpload: (fileCreate: FileConfirmationDTO, shareableToken: string) => Promise<FileDTO | undefined>;
};
export type CoreApiService = ReturnType<typeof CreateCoreApiService>;
export declare const coreApi: {
    /**
     * Retrieves the shareable configuration context using a shareable token.
     *
     * @param shareableToken - Token used to authenticate and identify the shareable resource
     * @returns Promise resolving to the ShareableContext, or undefined if not found
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    getConfiguration: (shareableToken: string) => Promise<ShareableContext | undefined>;
    /**
     * Sends a message to the webchat session.
     *
     * @param sessionId - Unique identifier for the webchat session
     * @param payload - Message payload containing the message text and optional additional data
     * @param shareableToken - Token used to authenticate the request
     * @returns Promise resolving to the created ChatMessage, or undefined if creation failed
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    sendWebchatMessage: (sessionId: string, payload: {
        message: string;
        [key: string]: unknown;
    }, shareableToken: string) => Promise<ChatMessage | undefined>;
    /**
     * Retrieves the complete message history for a webchat session.
     *
     * @param sessionId - Unique identifier for the webchat session
     * @param shareableToken - Token used to authenticate the request
     * @returns Promise resolving to an array of ChatMessages (empty array if no history exists)
     * @throws Error if the API request fails or returns an unsuccessful response
     */
    getWebchatHistory: (sessionId: string, shareableToken: string) => Promise<ChatMessage[]>;
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
    getPresignedUploadUrl: (fileCreate: FileCreateDTO, shareableToken: string) => Promise<SignedUrl | undefined>;
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
    confirmFileUpload: (fileCreate: FileConfirmationDTO, shareableToken: string) => Promise<FileDTO | undefined>;
};
//# sourceMappingURL=core-api.d.ts.map