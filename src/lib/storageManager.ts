/**
 * @fileoverview storageManager.ts — Gestión de assets en Cloudinary.
 */

import imageCompression from "browser-image-compression";

const CLOUD_NAME = "dty7oivjy";
const UPLOAD_PRESET = "ana-peluqueria";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CLOUDINARY_DESTROY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`;

const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET;

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.82,
};

// ─── HELPER: Generar firma SHA-1 nativa en el navegador ───────────────────
async function generateSHA1(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── HELPER: Extraer el Public ID de una URL de Cloudinary ────────────────
function extractPublicId(url: string) {
  try {
    const uploadSplit = url.split('/upload/');
    if (uploadSplit.length < 2) return null;
    let path = uploadSplit[1];
    path = path.replace(/^v\d+\//, ''); // Quita la versión (ej: v1711812345/)
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      path = path.substring(0, lastDotIndex); // Quita la extensión (.jpg, .webp)
    }
    return path;
  } catch (e) {
    return null;
  }
}

/**
 * Comprime y sube una imagen a Cloudinary.
 */
export async function compressAndUpload(file: File, storagePath?: string): Promise<string> {
  let compressedBlob: File | Blob;

  try {
    compressedBlob = await imageCompression(file, COMPRESSION_OPTIONS);
  } catch (err) {
    compressedBlob = file;
  }

  const formData = new FormData();
  formData.append("file", compressedBlob);
  formData.append("upload_preset", UPLOAD_PRESET);
  
  if (storagePath) {
    formData.append("folder", storagePath.split('/')[0]);
  }

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Fallo en la subida a Cloudinary");

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error subiendo imagen:", error);
    throw error;
  }
}

/**
 * Elimina físicamente un archivo de Cloudinary usando el API Secret.
 */
export async function deleteStorageFile(publicUrl: string): Promise<void> {
  if (!publicUrl || !publicUrl.includes("cloudinary.com")) return;

  const publicId = extractPublicId(publicUrl);
  if (!publicId) return;

  if (!API_KEY || !API_SECRET) {
    console.warn("⚠️ No se puede borrar: Faltan las llaves en .env.local");
    return;
  }

  try {
    // 1. Crear la firma (Fórmula exigida por Cloudinary: public_id + timestamp + api_secret)
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = await generateSHA1(stringToSign);

    // 2. Preparar los datos
    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("signature", signature);
    formData.append("api_key", API_KEY);
    formData.append("timestamp", timestamp);

    // 3. Enviar la petición de destrucción
    const response = await fetch(CLOUDINARY_DESTROY_URL, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      console.info(`🗑️ Imagen destruida en Cloudinary: ${publicId}`);
    } else {
      console.error("Fallo al intentar destruir la imagen", await response.text());
    }
  } catch (error) {
    console.error("Error destruyendo imagen:", error);
  }
}