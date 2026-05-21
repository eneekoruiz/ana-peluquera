import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { getCorsHeaders } from "@/lib/cors";

export async function GET(request: Request) {
  const headers = getCorsHeaders(request, 'GET, OPTIONS');
  try {
    const db = getDb();
    
    // Fetch settings/admin to get hidden_categories dynamically
    const settingsDoc = await db.collection("settings").doc("admin").get();
    const settingsData = settingsDoc.data() || {};
    const hiddenCategories: string[] = settingsData.hidden_categories || [];
    
    const normalize = (str: string) => 
      str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const normHidden = hiddenCategories.map((c: string) => normalize(c));

    const snapshot = await db.collection("services").get();
    const services = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }))
      .filter((s: any) => {
        const catNorm = normalize(s.category);
        return catNorm !== "masajes" && !normHidden.includes(catNorm);
      });

    return NextResponse.json(services, { headers });
  } catch (error) {
    console.error("❌ Error al leer Firestore:", error);
    return NextResponse.json({ error: "Error al cargar servicios" }, { status: 500, headers });
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request, 'GET, OPTIONS') });
}