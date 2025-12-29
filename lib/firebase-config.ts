import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

// Hardcoded fallback configuration
const fallbackConfig = {
  apiKey: "AIzaSyAaYdIpV6DOONv45P8jEppEa6Sl1x11qYs",
  authDomain: "computer-soln.firebaseapp.com",
  projectId: "computer-soln",
  storageBucket: "computer-soln.appspot.com",
  messagingSenderId: "345218081400",
  appId: "1:345218081400:web:2d1c0f9d149a90fd3a838d",
  measurementId: "G-LFVGEHQFGD"
}

// Use environment variables if available, otherwise use fallback values
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallbackConfig.measurementId,
}

let app;
let db;

try {
  // Initialize Firebase
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // Initialize Firestore
  db = getFirestore(app);
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export { app, db };