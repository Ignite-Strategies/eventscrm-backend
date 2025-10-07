import admin, { getFirebaseAdmin } from '../config/firebase.js';

/**
 * Auth Middleware - Verify Firebase ID tokens
 */
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    
    if (!firebaseApp) {
      console.warn('⚠️ Firebase Admin not initialized - skipping token verification');
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      firebaseId: decodedToken.uid,
      email: decodedToken.email
    };
    
    console.log('✅ Token verified for:', decodedToken.email);
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Optional Auth - Verify token if present, but allow unauthenticated
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      firebaseId: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    // Token invalid but that's ok for optional auth
    next();
  }
};

