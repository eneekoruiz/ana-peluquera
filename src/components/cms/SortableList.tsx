/**
 * @fileoverview SortableList — Wrapper de drag-and-drop (HTML5 API nativa).
 *
 * Permite reordenar una lista de ítems visualmente arrastrándolos.
 * No requiere ninguna librería adicional; usa la API de arrastrar y soltar
 * nativa del navegador (HTML5 DnD API) para no inflar el bundle.
 *
 * Cuando el orden cambia, llama a `onReorder(newItems)` con la lista reordenada.
 * El componente es genérico: acepta cualquier array de objetos con `id`.
 *
 * @module SortableList
 */

import { useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Restricción de tipo: todo ítem debe tener un `id` único. */
type WithId = { id: string };

/** Props de SortableList. */
interface SortableListProps<T extends WithId> {
  /** Array de ítems a renderizar y reordenar. */
  items: T[];
  /**
   * Callback invocado cuando el usuario suelta un ítem en su nueva posición.
   * Recibe el array completo ya reordenado.
   */
  onReorder: (reordered: T[]) => void;
  /** Función de render para cada ítem. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Si es false, desactiva el drag-and-drop (modo solo lectura). */
  isDraggable?: boolean;
  /** Clase CSS del contenedor lista. */
  className?: string;
}

/**
 * Lista drag-and-drop genérica.
 *
 * @example
 * <SortableList
 *   items={services}
 *   onReorder={handleReorder}
 *   renderItem={(svc, i) => <ServiceCard key={svc.id} svc={svc} />}
 *   isDraggable={isEditingView}
 * />
 */
function SortableList<T extends WithId>({
  items,
  onReorder,
  renderItem,
  isDraggable = true,
  className,
}: SortableListProps<T>) {
  /** Índice del ítem que se está arrastrando actualmente. */
  const dragIndex = useRef<number | null>(null);
  /** Índice sobre el que se está pasando el puntero. */
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    // Necesario en Firefox
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === dropIndex) {
      setOverIndex(null);
      return;
    }

    const reordered = [...items];
    const [removed] = reordered.splice(dragIndex.current, 1);
    reordered.splice(dropIndex, 0, removed);

    dragIndex.current = null;
    setOverIndex(null);
    onReorder(reordered);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setOverIndex(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable={isDraggable}
          onDragStart={isDraggable ? (e) => handleDragStart(e, index) : undefined}
          onDragOver={isDraggable ? (e) => handleDragOver(e, index) : undefined}
          onDrop={isDraggable ? (e) => handleDrop(e, index) : undefined}
          onDragEnd={isDraggable ? handleDragEnd : undefined}
          className={cn(
            "relative transition-all duration-150",
            isDraggable && "cursor-default",
            overIndex === index && dragIndex.current !== index
              ? "ring-2 ring-amber-400 ring-offset-1 rounded-lg scale-[1.01]"
              : "",
            dragIndex.current === index ? "opacity-40 scale-[0.98]" : "opacity-100"
          )}
          aria-label={isDraggable ? "Arrastra para reordenar" : undefined}
        >
          {/* Handle visual de drag (solo en modo edición) */}
          {isDraggable && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 flex items-center justify-center w-5 h-8 cursor-grab active:cursor-grabbing text-amber-400 hover:text-amber-600 transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
              aria-hidden="true"
            >
              <GripVertical size={14} />
            </div>
          )}

          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

export default SortableList;
