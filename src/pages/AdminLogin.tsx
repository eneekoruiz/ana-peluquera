import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Lock } from "lucide-react";

// Mock admin email — would be Firebase Auth restricted to this email only
const ADMIN_EMAIL = "ana@aglbeauty.com";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate auth — replace with Firebase Auth (sign-in only, no sign-up)
    await new Promise((r) => setTimeout(r, 800));

    if (email.toLowerCase() === ADMIN_EMAIL) {
      localStorage.setItem("agl-admin-auth", "true");
      toast.success("Bienvenida, Ana");
      navigate("/management-access/panel");
    } else {
      toast.error("Acceso denegado", {
        description: "Solo la administradora puede acceder.",
      });
    }
    setLoading(false);
  };

  return (
    <main className="pt-16 min-h-screen flex items-center justify-center">
      <div className="container max-w-sm">
        <ScrollReveal>
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-sand-light mx-auto mb-6 flex items-center justify-center">
              <Lock size={24} className="text-sand-dark" />
            </div>
            <span className="font-serif text-4xl tracking-wide text-foreground">AG</span>
            <p className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mt-3">
              Acceso Administración
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <form onSubmit={handleSubmit} className="bg-card rounded-lg p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-border rounded-lg text-sm font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                placeholder="admin@aglbeauty.com"
                autoComplete="email"
                required
              />
            </div>
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
              />
            </div>
            <Button variant="hero" size="lg" className="w-full h-14 text-base" type="submit" disabled={loading}>
              {loading ? "Verificando..." : "Acceder"}
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
