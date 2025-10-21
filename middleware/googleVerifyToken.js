/**
 * 🧭 Unified Google Token Verification Middleware
 * Handles tokens for Gmail, YouTube, Google Ads, and other Google services
 */

/**
 * Verify Google access token for any service
 * @param {string} service - Service name (gmail, youtube, ads, etc.)
 */
function createGoogleTokenVerifier(service = 'google') {
  return async function verifyGoogleToken(req, res, next) {
    console.log(`🔍 ${service.toUpperCase()} token verification middleware called`);
    console.log('📦 Request headers:', {
      authorization: req.headers.authorization ? 
        req.headers.authorization.substring(0, 30) + '...' : 
        'MISSING',
      'content-type': req.headers['content-type'],
      'x-admin-id': req.headers['x-admin-id']
    });
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error(`❌ Missing or invalid Authorization header for ${service}`);
      console.log('Available headers:', Object.keys(req.headers));
      return res.status(401).json({ 
        error: `Missing or invalid Authorization header for ${service}`,
        service: service
      });
    }

    const accessToken = authHeader.split("Bearer ")[1];
    console.log(`✅ ${service.toUpperCase()} token extracted:`, {
      tokenStart: accessToken.substring(0, 20) + '...',
      tokenLength: accessToken.length
    });

    try {
      // For now, we'll trust the token from the frontend
      // In production, you might want to verify it with Google's tokeninfo endpoint
      req.googleAccessToken = accessToken;
      req.googleService = service;
      
      // Legacy support - attach to service-specific property for backward compatibility
      if (service === 'gmail') {
        req.gmailAccessToken = accessToken;
      }
      
      console.log(`✅ ${service.toUpperCase()} token attached to req.googleAccessToken and req.${service}AccessToken`);
      next();
    } catch (error) {
      console.error(`❌ ${service.toUpperCase()} token verification failed:`, error);
      res.status(401).json({ 
        error: `Unauthorized for ${service}`,
        service: service
      });
    }
  };
}

// Convenience functions for specific services
export const verifyGmailToken = createGoogleTokenVerifier('gmail');
export const verifyYouTubeToken = createGoogleTokenVerifier('youtube');
export const verifyGoogleAdsToken = createGoogleTokenVerifier('ads');
export const verifyGoogleToken = createGoogleTokenVerifier('google');

// Default export for backward compatibility
export default verifyGmailToken;
