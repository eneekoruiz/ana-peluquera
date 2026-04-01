  /**
   * @fileoverview App.tsx — Punto de entrada y configuración de rutas.
   *
   * Cambios respecto a la versión anterior:
   * - Añadido `AuthProvider` que envuelve toda la app, proveyendo `isAdmin`,
   * `isEditingView` y `toggleEditingView` a todos los componentes.
   * - `AdminToolbar` se renderiza sobre el Navbar y solo es visible para Ana.
   * - `AdminRoute` ahora consume el `AuthContext` en lugar de gestionar su
   * propio `onAuthStateChanged` duplicado.
   * - Eliminadas rutas huérfanas de admin (/servicios, /revista, /agenda) porque 
   * ahora todo vive dentro de /portal-reservado/panel.
   *
   * @module App
   */

  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { BrowserRouter, Route, Routes } from "react-router-dom";
  import { Toaster as Sonner } from "@/components/ui/sonner";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { LanguageProvider } from "@/i18n/LanguageContext";
  import { AuthProvider } from "@/contexts/AuthContext";
  import Navbar from "@/components/Navbar";
  import Footer from "@/components/Footer";
  import AdminRoute from "@/components/AdminRoute";
  import AdminToolbar from "@/components/cms/AdminToolbar";
  import CancelBooking from "./pages/CancelBooking"; // Importar arriba
  import { SpeedInsights } from "@vercel/speed-insights/react";

  // Páginas públicas (ahora con CMS integrado)
  import Home from "./pages/Home";
  import Services from "./pages/Services";
  import QuienesSomos from "./pages/QuienesSomos";
  import Revista from "./pages/Revista";
  import Reservation from "./pages/Reservation";
  import Privacidad from "./pages/Privacidad";

  // Páginas de administración
  import AdminLogin from "./pages/AdminLogin";
  import AdminDashboard from "./pages/AdminDashboard";
  import ClientCRMPage from "@/pages/ClientCRMPage";
  import NotFound from "./pages/NotFound";

  /**
   * Cliente de React Query con configuración de reintentos conservadora
   * para no saturar el backend ante fallos transitorios.
   */
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 1000 * 60 * 2, // 2 minutos
      },
    },
  });

  /**
   * Componente raíz de la aplicación.
   */
  const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LanguageProvider>
            <Sonner richColors closeButton />
            <BrowserRouter>
              {/* Barra de admin flotante — visible solo para Ana */}
              <AdminToolbar />

              <Navbar />

              <Routes>
                {/* ── Páginas públicas (con CMS integrado cuando isEditingView) ── */}
                <Route path="/" element={<Home />} />
                <Route path="/servicios" element={<Services />} />
                <Route path="/quienes-somos" element={<QuienesSomos />} />
                <Route path="/revista" element={<Revista />} />
                <Route path="/reservar" element={<Reservation />} />
                <Route path="/privacidad" element={<Privacidad />} />

                {/* ── Autenticación ── */}
                <Route path="/portal-reservado" element={<AdminLogin />} />

                {/* ── Panel de administración (requiere sesión) ── */}
                <Route
                  path="/portal-reservado/panel"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                
                {/* ── CRM de clientes ── */}
                <Route
                  path="/portal-reservado/clientes"
                  element={
                    <AdminRoute>
                      <ClientCRMPage />
                    </AdminRoute>
                  }
                />

                {/* ── Rutas legacy (compatibilidad) ── */}
                <Route path="/gestion-privada-agl" element={<AdminLogin />} />
                <Route
                  path="/gestion-privada-agl/panel"
                  element={<AdminRoute><AdminDashboard /></AdminRoute>}
                />
                <Route path="/catalogo" element={<Revista />} />
                <Route path="/management-access" element={<AdminLogin />} />
                <Route path="/cancelar/:token" element={<CancelBooking />} />
                <Route
                  path="/management-access/panel"
                  element={<AdminRoute><AdminDashboard /></AdminRoute>}
                />

                <Route path="*" element={<NotFound />} />
              </Routes>

              <Footer />
            </BrowserRouter>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
      <SpeedInsights />
    </QueryClientProvider>
  );

  export default App;