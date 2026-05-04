/**
 * @fileoverview storageManager.ts — Gestión de assets en Cloudinary.
 */

import imageCompression from "browser-image-compression";

const CLOUD_NAME = "dty7oivjy";
const UPLOAD_PRESET = "ana-peluqueria";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CLOUDINARY_DESTROY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`;

const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.82,
};

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
 * Elimina físicamente un archivo de Cloudinary delegando en el backend por seguridad.
 */
export async function deleteStorageFile(publicUrl: string): Promise<void> {
  if (!publicUrl || !publicUrl.includes("cloudinary.com")) return;

  const publicId = extractPublicId(publicUrl);
  if (!publicId) return;

  try {
    // Llamamos a nuestro backend para que él firme la petición con el API_SECRET
    const response = await fetch(`${API_URL}/admin/delete-asset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicId }),
    });

    if (response.ok) {
      console.info(`🗑️ Imagen destruida vía Backend: ${publicId}`);
    } else {
      const errorData = await response.json();
      console.error("Fallo al intentar destruir la imagen vía Backend", errorData);
    }
  } catch (error) {
    console.error("Error destruyendo imagen vía Backend:", error);
  }
}