/**
 * @fileoverview AdminLogin.tsx — Página de acceso del administrador.
 *
 * Cambios respecto a la versión anterior:
 * - Usa `useAuth()` para detectar si Ana ya tiene sesión iniciada:
 * en ese caso redirige automáticamente al panel sin mostrar el formulario.
 * - Muestra spinner mientras se carga el estado de autenticación.
 * - JSDoc completo.
 * - Corrección de ruta: Redirige a /portal-reservado/dashboard
 *
 * @module AdminLogin
 */

import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Página de login del panel de administración.
 *
 * Si Ana ya tiene sesión activa (`isAdmin === true`), redirige directamente
 * al panel sin mostrar el formulario de login.
 */
const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  // Ruta de admin dinámica desde .env
  const adminRoute = import.meta.env.VITE_ADMIN_ROUTE || "/portal-reservado";

  // Mientras se resuelve el estado de auth, mostramos spinner
  if (authLoading) {
    return (
      <main className="pt-16 min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="text-sand-dark animate-spin" />
      </main>
    );
  }

  // Si ya está autenticada, redirigir al dashboard
  if (isAdmin) {
    return <Navigate to={`${adminRoute}/panel`} replace />;
  }

  /**
   * Maneja el envío del formulario de login.
   * Autentica con Firebase Auth y redirige al panel en caso de éxito.
   *
   * @param e - Evento de submit del formulario.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // El AuthContext detectará el cambio de estado automáticamente
      // vía onAuthStateChanged — solo navegamos al dashboard
      toast.success("Bienvenida, Ana 👋");
      navigate(`${adminRoute}/panel`);
      
    } catch (err: unknown) {
      console.error("Error en login:", err);
      const code = (err as { code?: string })?.code;

      let message = "Credenciales incorrectas.";
      if (code === "auth/too-many-requests") {
        message = "Demasiados intentos fallidos. Espera unos minutos.";
      } else if (
        code === "auth/user-not-found" || 
        code === "auth/wrong-password" || 
        code === "auth/invalid-credential"
      ) {
        message = "Email o contraseña incorrectos.";
      }

      toast.error("Acceso denegado", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-16 min-h-screen flex items-center justify-center">
      <div className="container max-w-sm">
        <ScrollReveal>
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-sand-light mx-auto mb-6 flex items-center justify-center">
              <Lock size={24} className="text-sand-dark" />
            </div>
            <span className="font-serif text-4xl tracking-wide text-foreground">AGL</span>
            <p className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mt-3">
              Acceso Administración
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <form
            onSubmit={handleSubmit}
            className="bg-card rounded-lg p-6 shadow-sm space-y-5"
          >
            {/* Campo email */}
            <div>
              <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-border rounded-lg text-sm font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                placeholder="ana@tudominio.com"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {/* Campo contraseña */}
            <div>
              <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-border rounded-lg text-sm font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            {/* Botón de acceso */}
            <Button
              variant="hero"
              size="lg"
              className="w-full h-14 text-base gap-2"
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Verificando…" : "Acceder"}
            </Button>

            <p className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-wide">
              Acceso restringido — Solo administradora
            </p>
          </form>
        </ScrollReveal>
      </div>
    </main>
  );
};

export default AdminLogin;