import admin from "firebase-admin";

// Initialize Firebase Admin SDK
// Service account key should be in environment variables or serviceAccountKey.json
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // From environment variable (for production)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  // From local file (for development)
  try {
    serviceAccount = require("./serviceAccountKey.json");
  } catch (error) {
    console.error("Firebase service account key not found. Please add serviceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.error("Firebase Admin SDK not initialized - no service account found");
}

export default admin;
