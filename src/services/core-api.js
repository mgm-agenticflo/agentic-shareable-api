const axios = require('axios');
const TransientTokenService = require('./transient-token');

class CoreApiService {
  constructor() {
    this.baseURL = process.env.CORE_API_URL;
    this.transientTokenService = new TransientTokenService();
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 seconds
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getConfiguration(shareableToken) {
    try {
      const response = await this.client.get(`/shareable/resource/${shareableToken}`);
      return response.data;
    } catch (error) {
      console.error('Resource error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 403) {
        throw new Error('INVALID_TOKEN');
      }
      throw new Error(`CONFIGURATION_ACCESS_ERROR: ${error.message}`);
    }
  }

  async sendWebchatMessage(transientToken, payload) {
    try {
      const tokenPayload = this.transientTokenService.verifyTransientToken(transientToken);
      const headers = { 'Authorization': `Bearer ${transientToken}` };
      const response = await this.client.post(`/shareable/webchat/${tokenPayload.shareableToken}`, payload, { headers });
      return response.data;
    } catch (error) {
      throw new Error('WEBCHAT_MESSAGE_ERROR');
    }
  }

  async getWebchatHistory(transientToken, sessionId) {
    try {
      const tokenPayload = this.transientTokenService.verifyTransientToken(transientToken);
      const headers = { 'Authorization': `Bearer ${transientToken}` };
      const response = await this.client.get(`/shareable/webchat/${tokenPayload.shareableToken}/history?sessionId=${sessionId}`, { headers });
      return response.data;
    } catch (error) {
      throw new Error('WEBCHAT_HISTORY_ERROR');
    }
  }
}

module.exports = CoreApiService;