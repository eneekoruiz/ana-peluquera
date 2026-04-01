/**
 * @fileoverview EditableImage — Imagen reemplazable in-situ (CMS).
 *
 * En modo edición, al hacer clic sobre cualquier imagen del CMS se abre
 * el selector de archivos. La imagen seleccionada se comprime automáticamente
 * con `browser-image-compression` antes de subirse a Firebase Storage.
 * Si había una imagen anterior en Storage, se elimina físicamente para evitar
 * acumulación de basura y costes innecesarios.
 *
 * En modo público, el componente renderiza un `<img>` estándar.
 *
 * @module EditableImage
 */

import { useRef, useState, type CSSProperties } from "react";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressAndUpload, deleteStorageFile } from "@/lib/storageManager";

/** Props del componente EditableImage. */
interface EditableImageProps {
  /** URL actual de la imagen (puede ser Storage URL o URL externa). */
  src: string;
  /** Alt text de la imagen para accesibilidad. */
  alt: string;
  /**
   * Ruta de destino en Firebase Storage (ej: `"magazine/item-abc"`).
   * Se usará como prefijo del nombre del archivo subido.
   */
  storagePath: string;
  /**
   * Callback invocado con la nueva URL pública una vez subida la imagen.
   * Debe persistir la URL en Firestore.
   */
  onSave: (newUrl: string) => Promise<void>;
  /** Activa el modo de edición. */
  isEditing: boolean;
  /** Clase CSS del contenedor wrapper. */
  className?: string;
  /** Clase CSS de la propia imagen. */
  imgClassName?: string;
  /** Estilos en línea del contenedor. */
  style?: CSSProperties;
}

/**
 * Imagen editable in-situ para el CMS del salón.
 *
 * @example
 * <EditableImage
 *   src={item.image_url}
 *   alt={item.title}
 *   storagePath={`magazine/${item.id}`}
 *   onSave={(url) => updateMagazineItem(item.id, { image_url: url })}
 *   isEditing={isEditingView}
 *   className="aspect-[3/4] rounded-lg overflow-hidden"
 *   imgClassName="w-full h-full object-cover"
 * />
 */
const EditableImage = ({
  src,
  alt,
  storagePath,
  onSave,
  isEditing,
  className,
  imgClassName,
  style,
}: EditableImageProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  /**
   * Maneja la selección de un archivo de imagen:
   * 1. Muestra preview local inmediato.
   * 2. Comprime la imagen con browser-image-compression.
   * 3. Sube a Firebase Storage y obtiene la URL pública.
   * 4. Elimina el archivo antiguo de Storage (si era una URL de Storage).
   * 5. Llama a `onSave(nuevaUrl)` para persistir en Firestore.
   *
   * @param e - Evento de cambio del input de tipo file.
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediato mientras se procesa
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      // 1. Subir con compresión automática
      const newUrl = await compressAndUpload(file, storagePath);

      // 2. Eliminar imagen anterior de Storage (evita basura acumulada)
      if (src && src.includes("firebasestorage.googleapis.com")) {
        await deleteStorageFile(src).catch((err) =>
          console.warn("⚠️ No se pudo eliminar imagen anterior:", err)
        );
      }

      // 3. Persistir la nueva URL en Firestore vía callback
      await onSave(newUrl);
      setPreview(null);

      toast.success("Imagen actualizada correctamente", { duration: 2500 });
    } catch (err) {
      console.error("❌ Error subiendo imagen:", err);
      setPreview(null); // Revertimos el preview
      toast.error("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
      // Reset input para permitir seleccionar el mismo archivo otra vez
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // ─── Modo solo lectura ────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <div className={className} style={style}>
        <img src={src} alt={alt} className={imgClassName} />
      </div>
    );
  }

  // ─── Modo edición ─────────────────────────────────────────────────────────
  const displaySrc = preview || src;

  return (
    <div
      className={cn(className, "relative group/img cursor-pointer")}
      style={style}
      onClick={() => !uploading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Hacer clic para cambiar la imagen"
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      {/* Imagen actual o preview */}
      <img
        src={displaySrc}
        alt={alt}
        className={cn(imgClassName, "transition-opacity duration-200", uploading && "opacity-40")}
      />

      {/* Overlay de edición */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 group-hover/img:bg-black/40 transition-all duration-300 rounded-[inherit]">
        {uploading ? (
          <Loader2
            size={28}
            className="text-white animate-spin opacity-0 group-hover/img:opacity-100 transition-opacity"
          />
        ) : (
          <>
            <Camera
              size={24}
              className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-md"
            />
            <span className="text-white text-xs font-medium opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 px-2 py-0.5 rounded-full">
              Cambiar foto
            </span>
          </>
        )}
      </div>

      {/* Borde indicador CMS */}
      <div className="absolute inset-0 ring-2 ring-dashed ring-amber-400/60 hover:ring-amber-400 rounded-[inherit] pointer-events-none transition-all" />

      {/* Input oculto de archivo */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

export default EditableImage;
