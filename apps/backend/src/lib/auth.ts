import { NextResponse } from "next/server";
import { requireAdminFromIdToken } from "./firebaseAdmin";

/**
 * 🔐 Helper reutilizable para proteger rutas de API.
 * Extrae el token, verifica identidad y confirma rol de administrador.
 */
export async function requireAdminRequest(request: Request) {
  let idToken: string | null = null;
  const authHeader = request.headers.get("authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    idToken = authHeader.split("Bearer ")[1];
  } else {
    try {
      const url = new URL(request.url, "http://localhost");
      idToken = url.searchParams.get("token");
    } catch (e) {
      // Ignorar fallo de parseo
    }
    // Fallback de seguridad: análisis por expresión regular
    if (!idToken) {
      const match = request.url.match(/[?&]token=([^&]+)/);
      if (match) {
        idToken = decodeURIComponent(match[1]);
      }
    }
  }
  
  if (!idToken) {
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 }) 
    };
  }

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
