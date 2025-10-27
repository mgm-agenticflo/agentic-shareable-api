// DEPRECATED: Use /resource/{token} endpoint instead
// This endpoint is kept for backward compatibility only

const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  return error('This endpoint is deprecated. Use /resource/{token} instead.', 410, 'DEPRECATED_ENDPOINT');
};