const CoreApiService = require("../services/core-api");
const { success, error, validateOrigin } = require("../utils/response");

const coreApi = new CoreApiService();

// This endpoint combines token validation and configuration loading

// Combined validation and configuration endpoint
exports.get = async (event) => {
	try {
		const { token } = event.pathParameters;

		if (!token) {
			return error("Token is required", 400, "MISSING_TOKEN");
		}

		// Get resource configuration (includes validation)
		const configData = await coreApi.getConfiguration(token);

		return success(configData);
	} catch (err) {
		console.error("Resource error:", err.message);

		if (err.message === "INVALID_TOKEN") {
			return error("Invalid or expired token", 403, "INVALID_TOKEN");
		}

		if (err.message.includes("CONFIGURATION_ACCESS_ERROR")) {
			return error("Configuration access denied", 403, "ACCESS_DENIED");
		}

		return error("Internal server error", 500, "INTERNAL_ERROR");
	}
};
