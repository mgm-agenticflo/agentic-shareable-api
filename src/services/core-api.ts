import axios, { AxiosInstance } from "axios";
import { TransientTokenService } from "./transient-token";

export class CoreApiService {
	public baseURL: string;
	public transientTokenService: TransientTokenService;
	private client: AxiosInstance;

	constructor() {
		this.baseURL = process.env.CORE_API_URL!;
		this.transientTokenService = new TransientTokenService();
		this.client = axios.create({
			baseURL: this.baseURL,
			timeout: 10000, // 10 seconds
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	async getConfiguration(shareableToken: string) {
		try {
			const response = await this.client.get(
				`/shareable/resource/${shareableToken}`
			);
			return response.data;
		} catch (error: any) {
			console.error("Resource error:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});

			if (error.response?.status === 403) {
				throw new Error("INVALID_TOKEN");
			}
			throw new Error(`CONFIGURATION_ACCESS_ERROR: ${error.message}`);
		}
	}

	async sendWebchatMessage(transientToken: string, payload: any) {
		try {
			const tokenPayload =
				this.transientTokenService.verifyTransientToken(transientToken);
			const headers = {
				Authorization: `Bearer ${transientToken}`,
				"x-session-id": payload.sessionId,
				"x-shareable-token": tokenPayload.shareableToken,
			};
			const response = await this.client.post(`/chats/new-message`, payload, {
				headers,
			});
			return response.data;
		} catch (error) {
			throw new Error("WEBCHAT_MESSAGE_ERROR");
		}
	}

	async getWebchatHistory(transientToken: string, sessionId: string) {
		try {
			const tokenPayload =
				this.transientTokenService.verifyTransientToken(transientToken);
			const headers = {
				Authorization: `Bearer ${transientToken}`,
				"x-session-id": sessionId,
				"x-shareable-token": tokenPayload.shareableToken,
			};
			const response = await this.client.get(`/chats/history`, {
				headers,
			});
			console.log("History response data:", response.data);
			return response?.data?.data?.messages || [];
		} catch (error) {
			throw new Error("WEBCHAT_HISTORY_ERROR");
		}
	}
}