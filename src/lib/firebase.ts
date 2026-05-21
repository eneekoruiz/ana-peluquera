import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Habilitamos persistencia offline para que la app sea robusta ante micro-cortes de red
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
          // Múltiples pestañas abiertas, solo una puede tener persistencia
          console.warn("Persistencia Firestore: Múltiples pestañas abiertas.");
      } else if (err.code === 'unimplemented') {
          // El navegador no lo soporta
          console.warn("Persistencia Firestore: El navegador no la soporta.");
      }
  });
}