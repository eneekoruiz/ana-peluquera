import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const isAuth = localStorage.getItem("agl-admin-auth") === "true";

  if (!isAuth) {
    return <Navigate to="/gestion-privada-agl" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
