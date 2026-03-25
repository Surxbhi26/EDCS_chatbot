import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, v]) => !v || String(v).trim() === '')
  .map(([k]) => k);

if (missingKeys.length) {
  // eslint-disable-next-line no-console
  console.error(
    `[Firebase] Missing config keys: ${missingKeys.join(', ')}. ` +
    'Create `edcs-chatbot/.env` with REACT_APP_FIREBASE_* values and restart `npm start`.'
  );
  throw new Error('Firebase config missing. Check edcs-chatbot/.env');
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

