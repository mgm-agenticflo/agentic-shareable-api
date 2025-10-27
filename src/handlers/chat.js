const CoreApiService = require('../services/core-api');
const { success, error } = require('../utils/response');

const coreApi = new CoreApiService();

exports.sendMessage = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { transientToken, payload } = body;

    if (!transientToken) {
      return error('Transient token is required', 400, 'MISSING_TRANSIENT_TOKEN');
    }

    if (!payload || !payload.message) {
      return error('Message is required', 400, 'MISSING_MESSAGE');
    }

    const response = await coreApi.sendWebchatMessage(transientToken, payload);
    return success(response);

  } catch (err) {
    console.error('Chat message error:', err.message);
    
    if (err.message.includes('INVALID_TRANSIENT_TOKEN')) {
      return error('Invalid or expired session', 403, 'INVALID_SESSION');
    }
    
    return error('Failed to send message', 500, 'CHAT_ERROR');
  }
};

exports.getHistory = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { transientToken, payload } = body;

    if (!transientToken) {
      return error('Transient token is required', 400, 'MISSING_TRANSIENT_TOKEN');
    }

    if (!payload || !payload.sessionId) {
      return error('Session ID is required', 400, 'MISSING_SESSION_ID');
    }

    const response = await coreApi.getWebchatHistory(transientToken, payload.sessionId);
    return success(response);

  } catch (err) {
    console.error('Chat history error:', err.message);
    
    if (err.message.includes('INVALID_TRANSIENT_TOKEN')) {
      return error('Invalid or expired session', 403, 'INVALID_SESSION');
    }
    
    return error('Failed to get history', 500, 'HISTORY_ERROR');
  }
};