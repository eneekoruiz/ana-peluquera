import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyFirebaseIdToken, isAllowedAdminEmail } from "./src/lib/firebaseAdmin";

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");  
  if (header) {
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1];
  }

  const cookieToken = req.cookies.get("firebaseIdToken")?.value;
  if (cookieToken) return cookieToken;

  return null;
}

export const config = {
  matcher: ["/portal-reservado/:path*", "/api/admin/:path*"],
  runtime: "nodejs",
};

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRequest = pathname.startsWith("/api/");

  // Permitimos siempre la página de login (frontend)
  if (pathname === "/portal-reservado") {
    return NextResponse.next();
  }

  const idToken = getBearerToken(req);
  
  if (!idToken) {
    if (isApiRequest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/portal-reservado";
    return NextResponse.redirect(url);
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const email = decoded.email;
    const isAuthorized = await isAllowedAdminEmail(email);

    if (!email || !isAuthorized) {
      console.warn(`⚠️ Acceso denegado: ${email}`);
      if (isApiRequest) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/portal-reservado";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("❌ Error middleware:", error);
    if (isApiRequest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/portal-reservado";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}