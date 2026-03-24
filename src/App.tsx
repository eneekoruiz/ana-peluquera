import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminRoute from "@/components/AdminRoute";
import Home from "./pages/Home";
import Services from "./pages/Services";
import QuienesSomos from "./pages/QuienesSomos";
import Revista from "./pages/Revista";
import Reservation from "./pages/Reservation";
import Privacidad from "./pages/Privacidad";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/servicios" element={<Services />} />
            <Route path="/quienes-somos" element={<QuienesSomos />} />
            <Route path="/revista" element={<Revista />} />
            <Route path="/reservar" element={<Reservation />} />
            <Route path="/privacidad" element={<Privacidad />} />
            <Route path="/portal-reservado" element={<AdminLogin />} />
            <Route
              path="/portal-reservado/panel"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            {/* Legacy routes */}
            <Route path="/gestion-privada-agl" element={<AdminLogin />} />
            <Route path="/gestion-privada-agl/panel" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/catalogo" element={<Revista />} />
            <Route path="/management-access" element={<AdminLogin />} />
            <Route path="/management-access/panel" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
