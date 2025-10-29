const CoreApiService = require("../services/core-api");
const { success, error } = require("../utils/response");
const axios = require("axios");

const coreApi = new CoreApiService();

exports.execute = async (event) => {
	try {
		const { action, payload, transientToken } = JSON.parse(event.body || "{}");

		if (!transientToken) {
			return error(
				"Transient token is required",
				400,
				"MISSING_TRANSIENT_TOKEN"
			);
		}

		if (!action) {
			return error("Action is required", 400, "MISSING_ACTION");
		}

		// Try to verify transient token, refresh if expired
		let tokenPayload;
		let newTransientToken = null;

		try {
			tokenPayload =
				coreApi.transientTokenService.verifyTransientToken(transientToken);
		} catch (err) {
			// Token expired, try to refresh
			console.log("Transient token expired, attempting refresh...");
			try {
				tokenPayload = coreApi.transientTokenService.verifyTransientToken(
					transientToken,
					{ ignoreExpiration: true }
				);
				console.log("Extracted payload:", tokenPayload);
				const shareableToken = tokenPayload.shareableToken;

				// Get fresh configuration (includes validation and new transient token)
				console.log("Getting fresh configuration...");
				const configData = await coreApi.getConfiguration(shareableToken);
				console.log("Configuration result:", configData);
				if (!configData.success) {
					return error(
						"Shareable token invalid",
						403,
						"SHAREABLE_TOKEN_INVALID"
					);
				}

				// Extract new transient token from configuration
				const configResult = configData.result || configData.data;
				newTransientToken = configResult.transientToken;
			} catch (refreshErr) {
				console.error("Token refresh error:", refreshErr.message);
				return error(
					`Token refresh failed: ${refreshErr.message}`,
					403,
					"TOKEN_REFRESH_FAILED"
				);
			}
		}

		const shareableToken = tokenPayload.shareableToken;

		// Execute action with real API calls
		let result;
		try {
			switch (action) {
				case "chat":
					console.log("Calling chat API:", `/chats/new-message`);
					console.log("Chat payload:", payload);

					// Create a client with longer timeout for chat (AI responses take time)
					const chatClient = axios.create({
						baseURL: coreApi.baseURL,
						timeout: 30000, // 30 seconds for AI responses
						headers: { "Content-Type": "application/json" },
					});

					result = await coreApi.sendWebchatMessage(
						newTransientToken || transientToken,
						payload
					);
					console.log("Chat API result:", result);
					break;

				case "history":
					console.log(
						"Calling history API:",
						`/chats/webchat/${shareableToken}/history`
					);
					result = await coreApi.getWebchatHistory(
						newTransientToken || transientToken,
						payload.sessionId
					);
					break;

				default:
					return error("Unsupported action", 400, "UNSUPPORTED_ACTION");
			}

			console.log("API response received:", result);
			console.log("API response data:", result.data);

			const responseData = {
				...(result.result && { ...result.result }),
				...(newTransientToken && { newTransientToken }),
			};
			console.log("Final response data:", responseData);
			return success(responseData);
		} catch (apiError) {
			console.error("API call failed:", {
				status: apiError.response?.status,
				message: apiError.message,
				data: apiError.response?.data,
			});

			if (apiError.code === "ECONNABORTED") {
				return error("API request timeout", 504, "TIMEOUT");
			}

			return error(`API call failed: ${apiError.message}`, 500, "API_ERROR");
		}
	} catch (err) {
		console.error("Action execution error:", err.message);

		if (err.response?.status === 403) {
			return error("Access denied", 403, "ACCESS_DENIED");
		}

		return error(`Action failed: ${err.message}`, 500, "EXECUTION_ERROR");
	}
};
