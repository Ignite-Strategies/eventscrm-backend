// Simple Gmail access token verification
async function verifyGmailToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const accessToken = authHeader.split("Bearer ")[1];

  try {
    // For now, we'll trust the token from the frontend
    // In production, you might want to verify it with Google's tokeninfo endpoint
    req.gmailAccessToken = accessToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}

export default verifyGmailToken;
