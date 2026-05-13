import admin from "firebase-admin";
import { readFileSync } from "node:fs";

// 🚀 ELIMINADO: Ya no necesitamos la constante hardcoded.
// El email se leerá directamente de Firestore.

let firebaseAdminApp: admin.app.App | null = null;

function getServiceAccountFromEnv(): admin.ServiceAccount {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return JSON.parse(json) as admin.ServiceAccount;
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    const fileContents = readFileSync(path, "utf8");
    return JSON.parse(fileContents) as admin.ServiceAccount;
  }
  throw new Error(
    "Missing Firebase service account. Provide FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH."
  );
}

/**
 * 🛠️ CORRECCIÓN: Ahora verifica si Firebase ya está inicializado 
 * para evitar el error "[DEFAULT] already exists".
 */
export function getFirebaseAdminApp(): admin.app.App {
  // 1. Si ya tenemos la referencia local, la devolvemos
  if (firebaseAdminApp) return firebaseAdminApp;

  // 2. Si Firebase Admin ya tiene apps inicializadas globalmente, usamos la primera (DEFAULT)
  if (admin.apps.length > 0) {
    firebaseAdminApp = admin.apps[0]!;
    return firebaseAdminApp;
  }

  // 3. Si no existe ninguna, la inicializamos por primera vez
  const serviceAccount = getServiceAccountFromEnv();
  firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return firebaseAdminApp;
}

/**
 * 🔐 NUEVA FUNCIÓN: Obtiene el email del admin desde Firestore (settings/admin)
 */
async function getAuthorizedAdminEmail(): Promise<string | null> {
  try {
    const db = getDb();
    const adminDoc = await db.collection("settings").doc("admin").get();
    
    if (!adminDoc.exists) {
      console.error("❌ ERROR: No se encuentra el documento settings/admin en Firestore.");
      return null;
    }

    return adminDoc.data()?.email || null;
  } catch (error) {
    console.error("❌ ERROR al leer admin desde Firestore:", error);
    return null;
  }
}

export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdminApp();
  const decoded = await app.auth().verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    claims: decoded,
  };
}

/**
 * 🛡️ VERSIÓN PRO: Ahora compara contra la base de datos, no contra el código.
 */
export async function requireAdminFromIdToken(idToken: string) {
  const { email, uid } = await verifyFirebaseIdToken(idToken);
  if (!email) throw new Error("Forbidden: token has no email.");

  // Buscamos quién es el admin oficial en este momento
  const authorizedEmail = await getAuthorizedAdminEmail();

  if (!authorizedEmail || email.toLowerCase() !== authorizedEmail.toLowerCase()) {
    const err = new Error("Forbidden: admin email mismatch or not configured.");
    (err as any).code = "FORBIDDEN";
    throw err;
  }

  return { uid, email };
}

/**
 * ⚡ UTILIDAD: Comprobación rápida (ahora asíncrona)
 */
export async function isAllowedAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const authorizedEmail = await getAuthorizedAdminEmail();
  return authorizedEmail ? email.toLowerCase() === authorizedEmail.toLowerCase() : false;
}

// 🛠️ FIX: En lugar de exportar instancias estáticas que se inicializan al arrancar el módulo,
// exportamos funciones getter. Esto evita errores de "Missing Service Account" en Cold Starts de Vercel.
export const getDb = () => getFirebaseAdminApp().firestore();
export const getAuthAdmin = () => getFirebaseAdminApp().auth();