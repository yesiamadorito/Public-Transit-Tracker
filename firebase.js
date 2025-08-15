// firebase.js
import { initializeApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
  signInAnonymously,
} from "firebase/auth";
import {
  initializeFirestore,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Load config from app.json; fallback to local firebase.config.json if you created it
let cfg =
  (Constants.expoConfig?.extra || Constants.manifest?.extra)?.firebase || null;
try {
  if (!cfg) cfg = require("./firebase.config.json");
} catch (_) { /* optional fallback */ }

// Validate config early
const required = ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"];
const missing = required.filter(k => !cfg?.[k] || String(cfg[k]).includes("REPLACE_ME"));
if (missing.length) {
  throw new Error(`Firebase config missing keys: ${missing.join(", ")}. Fix app.json → expo.extra.firebase.`);
}

// --- Initialize core app
const app = initializeApp(cfg);

// --- Proper RN Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// --- Firestore: RN/Expo needs long-polling on many networks
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true, // <- key line
  // If you still have trouble, try also: experimentalForceLongPolling: true
});

// Anonymous sign-in helper
export async function ensureAnonAuth() {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}
