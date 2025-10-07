import admin from 'firebase-admin';

let firebaseApp = null;

export function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccount) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not set - token verification disabled');
      return null;
    }

    const serviceAccountJSON = JSON.parse(serviceAccount);
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJSON)
    });

    console.log('✅ Firebase Admin initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    return null;
  }
}

export function getFirebaseAdmin() {
  if (!firebaseApp) {
    return initializeFirebaseAdmin();
  }
  return firebaseApp;
}

export default admin;

