import { NextResponse } from 'next/server';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives'; // Usamos primitives compatibles con Edge/Node

/**
 * Helper para generar la firma SHA-1 exigida por Cloudinary.
 */
async function generateSHA1(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/admin/delete-asset
 * Borra una imagen de Cloudinary usando el API Secret del servidor.
 */
export async function POST(request: Request) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary configuration missing' }, { status: 500 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await generateSHA1(stringToSign);

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

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: 'Cloudinary error', details: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in delete-asset:', error);
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
