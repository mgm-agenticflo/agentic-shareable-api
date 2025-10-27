const { corsHeaders } = require('../utils/response');

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: ''
  };
};