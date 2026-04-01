import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const CancelBooking = () => {
  const { token } = useParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const performCancellation = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
        const response = await fetch(`${API_URL}/bookings/cancel/${token}`, {
          method: "DELETE",
        });

        if (response.ok) setStatus("success");
        else setStatus("error");
      } catch (err) {
        setStatus("error");
      }
    };

    if (token) performCancellation();
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-warm-white px-6">
      <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-sm text-center">
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