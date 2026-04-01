/**
 * @fileoverview AdminRoute — Guard de rutas privadas del panel de Ana.
 *
 * Consume `AuthContext` para obtener el estado de autenticación ya resuelto,
 * evitando el `onAuthStateChanged` duplicado que existía en la versión anterior.
 *
 * Comportamiento:
 * - Mientras `loading` es true: muestra spinner minimalista.
 * - Si `isAdmin` es false: redirige a `/portal-reservado`.
 * - Si `isAdmin` es true: renderiza los `children`.
 *
 * Nota: No comprueba solo si hay sesión (`user !== null`), sino también
 * si el email del usuario corresponde al de la administradora (`isAdmin`),
 * añadiendo una capa extra de seguridad frente a accesos con cuentas ajenas.
 *
 * @module AdminRoute
 */

import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

/** Props de AdminRoute */
interface AdminRouteProps {
  /** Componente(s) hijo(s) a renderizar si el acceso es válido. */
  children: ReactNode;
}

/**
 * Componente de ruta protegida para el panel de administración.
 *
 * @param children - Contenido a mostrar si la sesión de admin es válida.
 *
 * @example
 * <Route
 *   path="/portal-reservado/panel"
 *   element={<AdminRoute><AdminDashboard /></AdminRoute>}
 * />
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  // Leemos del contexto unificado en lugar de gestionar nuestro propio listener
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <main className="pt-16 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-sand-dark/20 border-t-sand-dark rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">
            Verificando sesión…
          </p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/portal-reservado" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
