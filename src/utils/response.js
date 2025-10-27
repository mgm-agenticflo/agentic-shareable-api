const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

function success(data, newTransientToken = null, statusCode = 200) {
  const response = {
    success: true,
    data
  };
  
  if (newTransientToken) {
    response.newTransientToken = newTransientToken;
  }
  
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(response)
  };
}

function error(message, statusCode = 400, code = null) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      success: false,
      error: {
        message,
        code
      }
    })
  };
}

function validateOrigin(event, allowedOrigins) {
  const origin = event.headers.origin || event.headers.Origin;
  if (!origin) return false;
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith(domain);
    }
    return origin === allowed;
  });
}

module.exports = {
  success,
  error,
  validateOrigin,
  corsHeaders
};