import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 🚀 IMPORTANTE: Añadimos 'isAllowedAdminEmail' a la importación
import { verifyFirebaseIdToken, isAllowedAdminEmail } from "./src/lib/firebaseAdmin";
// ✅ ELIMINADO: Ya no existe el email fijo aquí.
// El sistema preguntará a Firestore en cada petición.

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");  
  if (header) {
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1];
  }

  // Token en cookies para navegaciones de navegador
  const cookieToken = req.cookies.get("firebaseIdToken")?.value;
  if (cookieToken) return cookieToken;

  return null;
}

export const config = {
  matcher: ["/portal-reservado/:path*"],
  // Firebase Admin requiere Node.js; el middleware debe correr en este runtime.
  runtime: "nodejs",
};

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitimos siempre la página de login
  if (pathname === "/portal-reservado") {
    return NextResponse.next();
  }

  const idToken = getBearerToken(req);
  
  // Si no hay token, redirigimos al login
  if (!idToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal-reservado";
    return NextResponse.redirect(url);
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const email = decoded.email;

    // 🚀 LÓGICA PRO: Consultamos dinámicamente si este email es el admin oficial
    const isAuthorized = await isAllowedAdminEmail(email);

    if (!email || !isAuthorized) {
      console.warn(`⚠️ Intento de acceso no autorizado: ${email}`);
      const url = req.nextUrl.clone();
      url.pathname = "/portal-reservado";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("❌ Error en validación de middleware:", error);
    const url = req.nextUrl.clone();
    url.pathname = "/portal-reservado";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}