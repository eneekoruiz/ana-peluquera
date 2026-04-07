import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"; // 🚀 Añadido AlertTriangle

const CancelBooking = () => {
  const { token } = useParams();
  // 🚀 FIX: El estado inicial ahora es "confirm" (esperando a que el usuario pulse el botón)
  const [status, setStatus] = useState<"confirm" | "loading" | "success" | "error">("confirm");

  // 🚀 FIX: Hemos sacado la lógica del useEffect. Ahora solo se ejecuta al hacer clic.
  const handleConfirmCancel = async () => {
    if (!token) return;
    setStatus("loading");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://ag-beauty-backend.vercel.app/api";
      
      const response = await fetch(`${API_URL}/bookings/cancel/${token}`, {
        method: "DELETE", // ⚠️ Asegúrate de que tu backend espera un DELETE (o cámbialo a POST si es lo que usas)
      });

      const data = await response.json().catch(() => null);

      if (response.ok && (!data || data.success !== false)) {
        setStatus("success");
      } else {
        console.error("Error del servidor:", data?.message);
        setStatus("error");
      }
    } catch (err) {
      console.error("Error de red:", err);
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-warm-white px-6">
      <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-sm text-center">
        
        {/* 🛡️ NUEVO: PANTALLA DE CONFIRMACIÓN (El escudo anti-bots) */}
        {status === "confirm" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="text-amber-500 w-10 h-10" />
            </div>
            <h1 className="font-serif text-2xl text-foreground">¿Cancelar tu cita?</h1>
            <p className="text-muted-foreground text-sm">
              Estás a punto de cancelar tu reserva. El hueco quedará libre para otras clientas. Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col gap-3 mt-4">
              <Button 
                variant="destructive" 
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white" 
                onClick={handleConfirmCancel}
              >
                Sí, cancelar mi cita
              </Button>
              <Button variant="outline" className="w-full h-12" asChild>
                <Link to="/">No, mantenerla</Link>
              </Button>
            </div>
          </div>
        )}

        {/* 👇 A PARTIR DE AQUÍ ES EXACTAMENTE TU CÓDIGO ORIGINAL 👇 */}
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-sand-dark" />
            <h1 className="font-serif text-2xl">Cancelando tu cita...</h1>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-green-600 w-10 h-10" />
            </div>
            <h1 className="font-serif text-2xl text-foreground">Cita Cancelada</h1>
            <p className="text-muted-foreground text-sm">Tu reserva ha sido eliminada correctamente. El hueco ya está disponible para otras clientas.</p>
            <Button variant="hero" className="w-full h-12" asChild>
              <Link to="/reservar">Reservar nueva cita</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <XCircle className="text-red-500 w-16 h-16 mx-auto" />
            <h1 className="font-serif text-2xl">Algo ha fallado</h1>
            <p className="text-muted-foreground text-sm">No hemos podido encontrar la reserva o ya ha sido cancelada.</p>
            <Button variant="outline" className="w-full h-12" asChild>
              <Link to="/">Volver al inicio</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default CancelBooking;