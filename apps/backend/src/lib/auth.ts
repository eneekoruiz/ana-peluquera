import { NextResponse } from "next/server";
import { requireAdminFromIdToken } from "./firebaseAdmin";

/**
 * 🔐 Helper reutilizable para proteger rutas de API.
 * Extrae el token, verifica identidad y confirma rol de administrador.
 */
export async function requireAdminRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 }) 
    };
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const user = await requireAdminFromIdToken(idToken);
    return { authorized: true, user };
  } catch (error: any) {
    console.warn(`⚠️ Intento de acceso administrativo fallido: ${error.message}`);
    const status = error.code === 'FORBIDDEN' ? 403 : 401;
    const msg = error.code === 'FORBIDDEN' ? "Forbidden: Not an authorized admin" : "Unauthorized: Invalid token";
    
    return { 
      authorized: false, 
      response: NextResponse.json({ error: msg }, { status }) 
    };
  }
}
