import { getApp, getApps, initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-expect-error - getReactNativePersistence is not in the public type defs
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Firebase configuration
//
// 1. Go to https://console.firebase.google.com and create a project "eden".
// 2. Add a Web app (</>) - no hosting needed. Copy the config object here.
// 3. Enable Authentication → Email/Password.
// 4. Create a Firestore database (production mode) and publish firestore.rules
//    from the repo root.
// See docs/FIREBASE_SETUP.md for the full walkthrough.
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "REPLACE_ME",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "REPLACE_ME.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "REPLACE_ME",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "REPLACE_ME.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "REPLACE_ME",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "REPLACE_ME",
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : (() => {
      try {
        return initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        return getAuth(app);
      }
    })();

let firestore;
try {
  firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  firestore = getFirestore(app);
}
export const db = firestore;
