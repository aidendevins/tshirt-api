import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let initialized = false;

// Initialize Firebase Admin SDK (singleton pattern)
function initializeFirebase() {
  if (!initialized && !admin.apps.length) {
    try {
      // Check if credentials exist
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        console.warn('⚠️  Firebase Admin credentials not found. Token tracking will be disabled.');
        console.warn('To enable token tracking, add these to your .env file:');
        console.warn('  - FIREBASE_PROJECT_ID');
        console.warn('  - FIREBASE_CLIENT_EMAIL');
        console.warn('  - FIREBASE_PRIVATE_KEY');
        return; // Don't initialize, but don't throw error
      }

      // Parse private key - handle both escaped and unescaped newlines
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
      initialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
      console.error('Private key format issue. Make sure FIREBASE_PRIVATE_KEY is properly formatted.');
      console.error('The key should look like: "-----BEGIN PRIVATE KEY-----\\nYourKeyHere\\n-----END PRIVATE KEY-----\\n"');
      // Don't throw - allow the app to continue without token tracking
    }
  }
}

// Getter function for Firestore DB
export function getAdminDb() {
  initializeFirebase();
  // Return null if not initialized (allows app to work without Firebase)
  if (!initialized) {
    return null;
  }
  return admin.firestore();
}

// Export FieldValue
export const FieldValue = admin.firestore.FieldValue;

export default admin;

