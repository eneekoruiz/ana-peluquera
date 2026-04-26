import { Link, useLocation } from "react-router-dom";
import { useState, Suspense, lazy } from "react";
import { Menu, X, Settings } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Lazy loading para ThemeToggle
const ThemeToggle = lazy(() => import("@/components/ThemeToggle"));

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();
  
  const { user } = useAuth();
  const isAdmin = user && (user as any).email === 'eneekoruiz@gmail.com';

  // Ruta de admin dinámica desde .env
  const adminRoute = import.meta.env.VITE_ADMIN_ROUTE || "/portal-reservado";

  const navLinks = [
    { to: "/",            label: t("nav.home") },
    { to: "/servicios",    label: t("nav.services") },
    { to: "/quienes-somos", label: t("nav.about") },
    { to: "/revista",      label: t("nav.magazine") },
    { to: "/reservar",     label: t("nav.book") },
  ];

  return (
    <header
      className={cn(
        "fixed left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border transition-[top] duration-300",
        isAdmin ? "top-11" : "top-0"
      )}
    >
      <nav className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl tracking-wide text-foreground">AG</span>
          <span className="hidden sm:inline text-[10px] font-sans tracking-widest-plus uppercase text-muted-foreground">
            Beauty Salon
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={cn(
                    "text-xs font-sans uppercase tracking-widest-plus transition-colors duration-200 hover:text-foreground",
                    location.pathname === link.to ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <Suspense fallback={<div className="w-8 h-8" />}>
              <ThemeToggle />
            </Suspense>
            <LanguageSelector />
            
            {isAdmin && (
              <Link 
                to={`${adminRoute}/panel`} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sand-dark text-white text-[10px] font-sans uppercase tracking-widest-plus rounded-md hover:bg-sand-dark/90 transition-colors"
              >
                <Settings size={12} />
                <span>Panel</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          {isAdmin && (
             <Link 
               to={`${adminRoute}/panel`} 
               className="flex items-center justify-center w-8 h-8 bg-sand-dark text-white rounded-md hover:bg-sand-dark/90 transition-colors"
             >
               <Settings size={14} />
             </Link>
          )}
          <LanguageSelector />
          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-foreground active:scale-95 transition-transform"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden bg-background border-b border-border animate-fade-in">
          <ul className="container py-6 flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block text-sm font-sans uppercase tracking-widest-plus py-2",
                    location.pathname === link.to ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="py-2 flex justify-center">
              <Suspense fallback={<div className="w-8 h-8" />}>
                <ThemeToggle />
              </Suspense>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;