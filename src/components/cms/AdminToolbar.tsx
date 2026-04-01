/**
 * @fileoverview AdminToolbar — Barra flotante del CMS visual.
 *
 * Se renderiza en la parte superior de la pantalla cuando Ana ha iniciado sesión.
 * Contiene:
 * - Toggle "Modo Edición / Vista de Cliente"
 * - Indicador de estado del modo activo
 * - Botón de cerrar sesión
 *
 * Solo se muestra si `isAdmin === true` (definido en AuthContext).
 * El `isEditingView` controla qué ven los componentes públicos.
 *
 * @module AdminToolbar
 */

import { Eye, PencilLine, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Barra de herramientas de administración flotante.
 *
 * Se posiciona sobre el Navbar existente mediante `fixed top-0 z-[200]`.
 * El Navbar y el contenido principal deben tener `pt-[88px]` cuando isAdmin
 * sea true, pero para no romper el layout actual, el toolbar se superpone
 * y empuja el contenido vía un spacer `<div className="h-11 ...">`.
 */
const AdminToolbar = () => {
  const { isAdmin, isEditingView, toggleEditingView, logout } = useAuth();

  // No renderizamos nada si Ana no está logueada.
  if (!isAdmin) return null;

  return (
    <>
      {/* Spacer para que el toolbar no tape el Navbar */}
      <div className="h-11 w-full bg-transparent" aria-hidden="true" />

      {/* Barra principal */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[200] h-11",
          "flex items-center justify-between px-4 gap-3",
          "border-b transition-colors duration-300",
          isEditingView
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-foreground/95 border-transparent text-background"
        )}
        role="toolbar"
        aria-label="Panel de administración"
      >
        {/* Indicador de modo */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <Sparkles size={13} className={isEditingView ? "text-amber-500" : "text-sand-dark"} />
          <span>
            {isEditingView ? (
              <>
                <span className="font-semibold">Modo Edición activo</span>
                <span className="hidden sm:inline text-amber-700"> — los cambios son visibles solo para ti</span>
              </>
            ) : (
              <>
                <span className="font-semibold">Estás como Ana</span>
                <span className="hidden sm:inline opacity-60"> — activa el modo edición para editar la web</span>
              </>
            )}
          </span>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2">
          {/* Toggle Edición / Vista Cliente */}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 text-xs gap-1.5 px-3 rounded-full transition-all",
              isEditingView
                ? "bg-amber-200 hover:bg-amber-300 text-amber-900"
                : "bg-white/10 hover:bg-white/20 text-background"
            )}
            onClick={toggleEditingView}
            aria-pressed={isEditingView}
            aria-label={isEditingView ? "Ver como cliente" : "Activar modo edición"}
          >
            {isEditingView ? (
              <>
                <Eye size={12} />
                Vista cliente
              </>
            ) : (
              <>
                <PencilLine size={12} />
                Modo edición
              </>
            )}
          </Button>

          {/* Logout */}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 text-xs gap-1 px-2 rounded-full",
              isEditingView
                ? "hover:bg-amber-200 text-amber-800"
                : "bg-white/10 hover:bg-white/20 text-background"
            )}
            onClick={logout}
            aria-label="Cerrar sesión"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminToolbar;
