import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is exported at runtime but not in types for some versions
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey || process.env.FIREBASE_API_KEY || '',
  authDomain: extra.firebaseAuthDomain || process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: extra.firebaseProjectId || process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: extra.firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: extra.firebaseMessagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: extra.firebaseAppId || process.env.FIREBASE_APP_ID || '',
};

let app: any;
let auth: any;
let db: any;

try {
  if (!firebaseConfig.apiKey) {
    console.warn('⚠️ Firebase API key is missing. Check your .env file.');
  }
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  db = getFirestore(app);
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
}

export { auth, db };
export default app;
