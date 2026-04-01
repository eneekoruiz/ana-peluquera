import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin"; // O la ruta que arreglamos antes

export async function GET() {
  try {
    // 🔍 Esto busca la carpeta "services" en tu Firestore
    const snapshot = await db.collection("services").get();
    
    // Convertimos los datos de Firebase en una lista limpia
    const services = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(services);
  } catch (error) {
    console.error("❌ Error al leer Firestore:", error);
    return NextResponse.json({ error: "Error al cargar servicios" }, { status: 500 });
  }
}

// IMPORTANTE: Añade esto para que el navegador no bloquee la petición inicial
export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" } 
  });
}