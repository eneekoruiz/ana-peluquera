import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Protects admin routes — redirects to login if not authenticated.
 * Currently uses localStorage mock; replace with real auth check.
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const isAuth = localStorage.getItem("agl-admin-auth") === "true";

  if (!isAuth) {
    return <Navigate to="/management-access" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
