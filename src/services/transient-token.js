const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class TransientTokenService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'agentic-jwt-secret-2024-secure-middleware-token-signing-key-production';
    this.expiresIn = '10s'; // 10 seconds
  }

  generateTransientToken(shareableToken, resourceType, resourceId) {
    const payload = {
      shareableToken,
      resourceType,
      resourceId,
      type: 'transient',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verifyTransientToken(token, options = {}) {
    try {
      return jwt.verify(token, this.secret, options);
    } catch (error) {
      console.error('JWT verification error:', error.message);
      throw new Error(`INVALID_TRANSIENT_TOKEN: ${error.message}`);
    }
  }
}

module.exports = TransientTokenService;