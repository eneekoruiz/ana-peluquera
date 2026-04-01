/**
 * @fileoverview AuthContext — Fuente única de verdad de autenticación.
 *
 * Expone:
 * - `user`            → el usuario de Firebase (o null)
 * - `isAdmin`         → true si el email coincide con el email de admin de settings
 * - `isEditingView`   → true si el panel CMS está activo (solo cuando isAdmin === true)
 * - `toggleEditingView` → alterna entre modo edición y vista de cliente
 * - `logout`          → cierra sesión en Firebase Auth
 *
 * El componente AdminToolbar usa `isAdmin` para mostrar el interruptor de
 * "Modo Edición". Todos los componentes públicos (Services, Revista,
 * QuienesSomos) leen `isEditingView` del contexto para activar el CMS in-situ.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

/** Forma del contexto de autenticación. */
interface AuthContextType {
  /** Usuario actual de Firebase, o null si no hay sesión. */
  user: User | null;
  /** True mientras se resuelve la sesión inicial. */
  loading: boolean;
  /** True si el usuario autenticado es Ana (admin). */
  isAdmin: boolean;
  /**
   * True cuando el modo de edición visual está activo.
   * Solo puede ser true cuando `isAdmin` también lo es.
   */
  isEditingView: boolean;
  /** Alterna el Modo Edición (CMS) on/off. */
  toggleEditingView: () => void;
  /** Cierra sesión y redirige al login. */
  logout: () => Promise<void>;
}

/**
 * Email del administrador del salón.
 * Se lee de la variable de entorno VITE_ADMIN_EMAIL para no hardcodearlo.
 * Fallback a una dirección de desarrollo si la variable no está definida.
 */
const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL || "ana@anagonzalez.es";

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isEditingView: false,
  toggleEditingView: () => {},
  logout: async () => {},
});

/**
 * Proveedor de autenticación. Envuelve toda la aplicación en `main.tsx` / `App.tsx`.
 *
 * @param children - Árbol de componentes hijo.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingView, setIsEditingView] = useState(false);

  /** Determina si el usuario activo es el admin. */
  const isAdmin = !!user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    /** Suscripción reactiva al estado de Firebase Auth. */
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Si se cierra sesión, desactivamos el modo edición automáticamente.
      if (!firebaseUser) setIsEditingView(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Alterna entre el Modo Edición (CMS) y la Vista de Cliente.
   * Solo funciona si el usuario es admin.
   */
  const toggleEditingView = useCallback(() => {
    if (!isAdmin) return;
    setIsEditingView((prev) => !prev);
  }, [isAdmin]);

  /**
   * Cierra la sesión de Firebase y desactiva el modo edición.
   */
  const logout = useCallback(async () => {
    setIsEditingView(false);
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, isEditingView, toggleEditingView, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook de acceso al contexto de autenticación.
 *
 * @example
 * const { isAdmin, isEditingView, toggleEditingView } = useAuth();
 */
export const useAuth = () => useContext(AuthContext);
