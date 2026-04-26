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
  import { ThemeProvider } from "next-themes";
  import { LanguageProvider } from "@/i18n/LanguageContext";
  import { AuthProvider } from "@/contexts/AuthContext";
  import { Suspense, lazy } from "react";
  import Navbar from "@/components/Navbar";
  import Footer from "@/components/Footer";
  import AdminRoute from "@/components/AdminRoute";
  import AdminToolbar from "@/components/cms/AdminToolbar";
  import CancelBooking from "./pages/CancelBooking";
  import { Analytics } from "@vercel/analytics/react";
  import CookieBanner from "@/components/CookieBanner";

  // Lazy loading para páginas públicas
  const Home = lazy(() => import("./pages/Home"));
  const Services = lazy(() => import("./pages/Services"));
  const QuienesSomos = lazy(() => import("./pages/QuienesSomos"));
  const Revista = lazy(() => import("./pages/Revista"));
  const Reservation = lazy(() => import("./pages/Reservation"));
  const Privacidad = lazy(() => import("./pages/Privacidad"));
  const Cookies = lazy(() => import("./pages/Cookies"));

  // Lazy loading para páginas de administración
  const AdminLogin = lazy(() => import("./pages/AdminLogin"));
  const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
  const ClientCRMPage = lazy(() => import("@/pages/ClientCRMPage"));
  const NotFound = lazy(() => import("./pages/NotFound"));

  // Ruta de admin dinámica desde .env
  const adminRoute = import.meta.env.VITE_ADMIN_ROUTE || "/portal-reservado";

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
  // Componente de loading simple
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <LanguageProvider>
              <Sonner richColors closeButton />
              <BrowserRouter>
              {/* Barra de admin flotante — visible solo para Ana */}
              <AdminToolbar />

              <Navbar />

              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* ── Páginas públicas (con CMS integrado cuando isEditingView) ── */}
                  <Route path="/" element={<Home />} />
                  <Route path="/servicios" element={<Services />} />
                  <Route path="/quienes-somos" element={<QuienesSomos />} />
                  <Route path="/revista" element={<Revista />} />
                  <Route path="/reservar" element={<Reservation />} />
                  <Route path="/privacidad" element={<Privacidad />} />
                  <Route path="/cookies" element={<Cookies />} />

                {/* ── Autenticación ── */}
                <Route path={adminRoute} element={<AdminLogin />} />

                {/* ── Panel de administración (requiere sesión) ── */}
                <Route
                  path={`${adminRoute}/panel`}
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                
                {/* ── CRM de clientes ── */}
                <Route
                  path={`${adminRoute}/clientes`}
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
              </Suspense>

              <Footer />
              <CookieBanner />
            </BrowserRouter>
            <Analytics />
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );

  export default App;