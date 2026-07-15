import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if credentials are correct and loaded (not dummy placeholder and not empty)
export const isFirebaseConfigured = 
  Boolean(firebaseConfig.apiKey) && 
  firebaseConfig.apiKey !== 'your_api_key_here' && 
  Boolean(firebaseConfig.projectId) && 
  firebaseConfig.projectId !== 'your_project_id_here';

let db: any = null;
let auth: any = null;
let app: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Optional: Connect to local emulators if configured in dev
    if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('Connected to Firebase Emulators');
    }
  } catch (error) {
    console.error('Error initializing Firebase services, falling back to mock mode:', error);
  }
} else {
  console.warn(
    'Firebase credentials are not configured or placeholder detected. Running in Demo (Mock) Mode.'
  );
}

export { app, db, auth };
