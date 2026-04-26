import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { loading, isAdmin } = useAuth();
  const loginRoute = import.meta.env.VITE_ADMIN_ROUTE || "/portal-reservado";

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
    return <Navigate to={loginRoute} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
