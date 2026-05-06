import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireAdminFromIdToken } from '@/lib/firebaseAdmin';
import { z } from 'zod';

const deleteSchema = z.object({
  publicId: z.string().min(1).max(255),
});

/**
 * POST /api/admin/delete-asset
 * Borra una imagen de Cloudinary usando el API Secret del servidor.
 * 
 * 🔒 SEGURIDAD:
 * - Requiere Authorization: Bearer <firebaseIdToken>
 * - Solo accesible por administradores configurados en Firestore.
 * - Firma generada en servidor para no exponer API Secret.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    
    // Verifica token y rol de admin (throws if invalid)
    await requireAdminFromIdToken(token);

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid publicId' }, { status: 400 });
    }

    const { publicId } = parsed.data;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary configuration missing' }, { status: 500 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    
    // Generación de firma SHA-1 (exigida por Cloudinary)
    // Se usa un objeto para asegurar el orden alfabético y evitar problemas de codificación.
    const params: Record<string, string> = {
      public_id: publicId,
      timestamp: timestamp,
    };
    
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&') + apiSecret;

    const signature = crypto.createHash('sha1').update(signString).digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('signature', signature);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to delete from Cloudinary' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete-asset:', error.message);
    const status = error.code === 'FORBIDDEN' ? 403 : 500;
    const msg = error.code === 'FORBIDDEN' ? 'Forbidden: Access denied' : 'Internal server error';
    return NextResponse.json({ error: msg }, { status });
  }
}
