import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Autenticación pendiente — conecta Firebase para activar login");
  };

  return (
    <main className="pt-16 min-h-screen flex items-center justify-center">
      <div className="container max-w-sm">
        <ScrollReveal>
          <div className="text-center mb-10">
            <span className="font-serif text-5xl tracking-wide text-foreground">AG</span>
            <p className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mt-3">
              Acceso al Salón
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
                className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm font-sans text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                placeholder="tu@email.com"
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
                className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm font-sans text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                placeholder="••••••••"
              />
            </div>
            <Button variant="hero" size="lg" className="w-full" type="submit">
              Iniciar Sesión
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <button type="button" className="text-foreground underline underline-offset-2">
                Crear cuenta
              </button>
            </p>
          </form>
        </ScrollReveal>
      </div>
    </main>
  );
};

export default Login;
