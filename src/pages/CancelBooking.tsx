import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle, 
  CalendarClock, 
  Phone, 
  MessageCircle,
  ArrowLeft
} from "lucide-react";

// 🚀 Añade aquí el número de Ana (con el código de país, ej: 34 para España)
const SALON_PHONE = "34600000000"; 

const CancelBooking = () => {
  const { token } = useParams();
  
  // 🚀 Nuevos estados para navegar por el menú
  const [view, setView] = useState<"menu" | "confirm_cancel" | "edit_info" | "loading" | "success" | "error">("menu");

  const handleConfirmCancel = async () => {
    if (!token) return;
    setView("loading");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://ag-beauty-backend.vercel.app/api";
      
      const response = await fetch(`${API_URL}/bookings/cancel/${token}`, {
        method: "DELETE", 
      });

      const data = await response.json().catch(() => null);

      if (response.ok && (!data || data.success !== false)) {
        setView("success");
      } else {
        console.error("Error del servidor:", data?.message);
        setView("error");
      }
    } catch (err) {
      console.error("Error de red:", err);
      setView("error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-warm-white px-6 py-12">
      <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-sm text-center transition-all duration-300">
        
        {/* 1️⃣ EL MENÚ PRINCIPAL */}
        {view === "menu" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-sand-light rounded-full flex items-center justify-center mx-auto">
              <CalendarClock className="text-sand-dark w-8 h-8" />
            </div>
            <h1 className="font-serif text-2xl text-foreground">Gestionar Cita</h1>
            <p className="text-muted-foreground text-sm">
              ¿Qué necesitas hacer con tu reserva en AG Beauty?
            </p>
            <div className="flex flex-col gap-3 mt-6">
              <Button 
                variant="hero" 
                className="w-full h-12"
                onClick={() => setView("edit_info")}
              >
                Modificar fecha u hora
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setView("confirm_cancel")}
              >
                Cancelar la cita
              </Button>
            </div>
          </div>
        )}

        {/* 2️⃣ PANTALLA DE MODIFICAR (Deriva a contacto manual) */}
        {view === "edit_info" && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h1 className="font-serif text-2xl text-foreground">Modificar Cita</h1>
            <p className="text-muted-foreground text-sm text-left">
              Para garantizar que el tiempo de tu servicio se ajusta perfectamente a la agenda, las modificaciones de citas las gestionamos de forma personalizada.
              <br/><br/>
              Por favor, ponte en contacto con nosotras y buscaremos el mejor hueco para ti:
            </p>
            
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full h-12 gap-2" asChild>
                <a href={`https://wa.me/${SALON_PHONE}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  Escribir por WhatsApp
                </a>
              </Button>
              <Button variant="outline" className="w-full h-12 gap-2" asChild>
                <a href={`tel:+${SALON_PHONE}`}>
                  <Phone className="w-5 h-5 text-sand-dark" />
                  Llamar al salón
                </a>
              </Button>
            </div>

            <Button variant="ghost" className="mt-4 text-muted-foreground" onClick={() => setView("menu")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver atrás
            </Button>
          </div>
        )}

        {/* 3️⃣ PANTALLA DE CONFIRMAR CANCELACIÓN (El Escudo) */}
        {view === "confirm_cancel" && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
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
              <Button variant="outline" className="w-full h-12" onClick={() => setView("menu")}>
                No, mantenerla
              </Button>
            </div>
          </div>
        )}

        {/* 4️⃣ ESTADOS DE CARGA Y RESULTADO */}
        {view === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-sand-dark" />
            <h1 className="font-serif text-2xl">Cancelando tu cita...</h1>
          </div>
        )}

        {view === "success" && (
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

        {view === "error" && (
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