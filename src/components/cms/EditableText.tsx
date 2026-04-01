/**
 * @fileoverview EditableText — Componente de edición de texto in-situ (CMS).
 *
 * Cuando `isEditing` es true (modo CMS activo), el texto se convierte en un
 * `contentEditable`. Al hacer clic fuera o pulsar Ctrl+Enter se guarda el cambio
 * llamando a `onSave(nuevoTexto)`. En modo público, renderiza el contenido tal cual.
 *
 * Diseño intencionado: el contorno de edición es sutil (amber dashed) para no
 * romper la estética del salón.
 *
 * @module EditableText
 */

import {
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
  type CSSProperties,
} from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Props del componente EditableText. */
interface EditableTextProps {
  /**
   * Contenido actual del texto (el que se muestra cuando no se edita).
   * Puede ser una cadena o un nodo React (para modo solo lectura).
   */
  value: string;
  /**
   * Función asíncrona que persiste el cambio. Recibe el nuevo texto.
   * Si lanza un error, EditableText muestra un toast de error y revierte.
   */
  onSave: (newValue: string) => Promise<void>;
  /** Si es true, activa el modo de edición in-situ. */
  isEditing: boolean;
  /** Clase CSS adicional para el contenedor del texto. */
  className?: string;
  /** Estilos en línea opcionales. */
  style?: CSSProperties;
  /**
   * El elemento HTML que envuelve el texto en modo solo lectura.
   * @default "span"
   */
  as?: keyof JSX.IntrinsicElements;
  /** Placeholder visible cuando el texto está vacío en modo edición. */
  placeholder?: string;
  /** Nombre del idioma actual para el feedback al usuario. */
  langLabel?: string;
}

/**
 * Texto editable in-situ para el CMS de Ana.
 *
 * @example
 * <EditableText
 *   value={svc.label_es}
 *   onSave={(v) => updateService(svc.id, { label_es: v })}
 *   isEditing={isEditingView}
 *   className="font-serif text-lg"
 *   as="h3"
 * />
 */
const EditableText = ({
  value,
  onSave,
  isEditing,
  className,
  style,
  as: Tag = "span",
  placeholder = "Escribe aquí…",
  langLabel,
}: EditableTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  /** Guarda el contenido actual del contentEditable. */
  const handleSave = useCallback(async () => {
    if (!ref.current || !isDirty) return;

    const newText = ref.current.innerText.trim();

    if (newText === value) {
      setIsDirty(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(newText);
      setIsDirty(false);
      toast.success(
        langLabel
          ? `Texto guardado en ${langLabel}`
          : "Texto actualizado",
        { duration: 2000 }
      );
    } catch {
      toast.error("No se pudo guardar el cambio");
      // Revertimos visualmente el DOM al valor original
      if (ref.current) ref.current.innerText = value;
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, onSave, value, langLabel]);

  /** Descarta los cambios y restaura el valor original. */
  const handleDiscard = useCallback(() => {
    if (ref.current) ref.current.innerText = value;
    setIsDirty(false);
  }, [value]);

  /** Ctrl+Enter → guardar. Escape → descartar. */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        handleDiscard();
      }
    },
    [handleSave, handleDiscard]
  );

  // ─── Modo solo lectura (cliente) ─────────────────────────────────────────
  if (!isEditing) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  // ─── Modo edición (admin) ─────────────────────────────────────────────────
  return (
    <div className="relative group/editable">
      {/* Texto editable */}
      <Tag
        // @ts-expect-error contentEditable está disponible en todos los elementos HTML
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setIsDirty(true)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={cn(
          className,
          "outline-none cursor-text relative",
          "rounded-sm transition-all",
          "before:empty:content-[attr(data-placeholder)] before:empty:text-muted-foreground/40",
          isDirty
            ? "ring-2 ring-amber-400 ring-offset-1 bg-amber-50/50 px-1"
            : "ring-1 ring-dashed ring-amber-300/60 hover:ring-amber-400 px-1"
        )}
        style={style}
        aria-label="Campo de texto editable — pulsa para editar"
        title="Haz clic para editar. Ctrl+Enter para guardar, Esc para cancelar"
      >
        {value}
      </Tag>

      {/* Botones de acción (aparecen si hay cambios sin guardar) */}
      {isDirty && (
        <span
          className="absolute -top-7 right-0 flex gap-1 z-10 animate-in fade-in slide-in-from-bottom-1 duration-150"
          onMouseDown={(e) => e.preventDefault()} // Previene blur antes del click
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-medium px-2 py-1 rounded-sm shadow-md hover:bg-green-700 transition-colors"
            aria-label="Guardar cambio"
          >
            <Check size={10} />
            {isSaving ? "…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="flex items-center gap-0.5 bg-white border text-muted-foreground text-[10px] font-medium px-2 py-1 rounded-sm shadow-md hover:bg-muted transition-colors"
            aria-label="Descartar cambio"
          >
            <X size={10} />
          </button>
        </span>
      )}

      {/* Etiqueta de idioma */}
      {langLabel && (
        <span className="absolute -bottom-5 left-0 text-[9px] text-amber-500 font-medium opacity-0 group-hover/editable:opacity-100 transition-opacity pointer-events-none">
          Editando: {langLabel}
        </span>
      )}
    </div>
  );
};

export default EditableText;
