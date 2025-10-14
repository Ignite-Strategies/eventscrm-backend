// Simple Gmail access token verification
async function verifyGmailToken(req, res, next) {
  console.log('🔍 verifyGmailToken middleware called');
  console.log('📦 Request headers:', {
    authorization: req.headers.authorization ? 
      req.headers.authorization.substring(0, 30) + '...' : 
      'MISSING',
    'content-type': req.headers['content-type'],
    'x-admin-id': req.headers['x-admin-id']
  });
  
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error('❌ Missing or invalid Authorization header');
    console.log('Available headers:', Object.keys(req.headers));
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const accessToken = authHeader.split("Bearer ")[1];
  console.log('✅ Token extracted:', {
    tokenStart: accessToken.substring(0, 20) + '...',
    tokenLength: accessToken.length
  });

  try {
    // For now, we'll trust the token from the frontend
    // In production, you might want to verify it with Google's tokeninfo endpoint
    req.gmailAccessToken = accessToken;
    console.log('✅ Token attached to req.gmailAccessToken');
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}

export default verifyGmailToken;
