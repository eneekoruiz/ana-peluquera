import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Check, ArrowLeft, ArrowRight, Calendar, User, Phone } from "lucide-react";

type Step = 1 | 2 | 3;

const services = [
  { id: "corte", label: "Corte", duration: "30 min", icon: "✂️" },
  { id: "color", label: "Color", duration: "90 min", icon: "🎨" },
  { id: "mechas", label: "Mechas", duration: "120 min", icon: "💫" },
  { id: "peinado", label: "Peinado", duration: "45 min", icon: "💇‍♀️" },
  { id: "barba", label: "Barba", duration: "20 min", icon: "🧔" },
  { id: "tratamiento", label: "Tratamiento Capilar", duration: "60 min", icon: "💆" },
  { id: "manicura", label: "Manicura", duration: "45 min", icon: "💅" },
];

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30", "18:00", "18:30",
];

// Mock occupied slots (would come from Google Calendar API)
const occupiedSlots = ["10:00", "11:00", "15:30", "16:00"];

const generateDates = () => {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) dates.push(d); // skip Sundays
  }
  return dates;
};

const formatDate = (d: Date) => {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return { day: days[d.getDay()], num: d.getDate(), month: months[d.getMonth()] };
};

const Reservation = () => {
  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const availableDates = generateDates();

  const canAdvance = () => {
    if (step === 1) return !!selectedService;
    if (step === 2) return !!selectedDate && !!selectedTime;
    if (step === 3) return name.trim().length >= 2 && phone.trim().length >= 9;
    return false;
  };

  const handleSubmit = () => {
    // Would send to Google Calendar API + Firestore
    toast.success("¡Cita reservada con éxito!", {
      description: "Recibirás confirmación pronto.",
    });
    setSubmitted(true);
  };

  if (submitted) {
    const service = services.find((s) => s.id === selectedService);
    const dateInfo = selectedDate ? formatDate(selectedDate) : null;
    return (
      <main className="pt-16 min-h-screen flex items-center justify-center">
        <div className="container max-w-md text-center">
          <ScrollReveal>
            <div className="w-20 h-20 rounded-full bg-green-50 mx-auto mb-8 flex items-center justify-center">
              <Check size={32} className="text-green-600" />
            </div>
            <h1 className="font-serif text-3xl text-foreground mb-3" style={{ lineHeight: "1.1" }}>
              Reserva Confirmada
            </h1>
            <p className="text-muted-foreground mb-8">Te esperamos en el salón</p>
            <div className="bg-card rounded-lg p-6 shadow-sm text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Servicio</span>
                <span className="text-foreground font-medium">{service?.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fecha</span>
                <span className="text-foreground font-medium tabular-nums">
                  {dateInfo?.num} {dateInfo?.month}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hora</span>
                <span className="text-foreground font-medium tabular-nums">{selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nombre</span>
                <span className="text-foreground font-medium">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Teléfono</span>
                <span className="text-foreground font-medium tabular-nums">{phone}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              José María Salaberría 33, Donostia
            </p>
          </ScrollReveal>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-16">
      <section className="py-12 md:py-20">
        <div className="container max-w-lg">
          <ScrollReveal>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-2" style={{ lineHeight: "1.1" }}>
              Reserva Tu Cita
            </h1>
            <p className="text-center text-sm text-muted-foreground mb-10">
              3 pasos sencillos — sin registro necesario
            </p>
          </ScrollReveal>

          {/* Progress bar */}
          <ScrollReveal delay={100}>
            <div className="flex items-center gap-2 mb-10 max-w-xs mx-auto">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-medium transition-colors duration-300 ${
                      step >= s
                        ? "bg-charcoal text-cream"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {step > s ? <Check size={14} /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-px transition-colors duration-300 ${step > s ? "bg-charcoal" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Step 1 — Service */}
          {step === 1 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-6 text-center">
                ¿Qué servicio necesitas?
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`flex items-center gap-4 p-5 rounded-lg text-left transition-all duration-200 active:scale-[0.98] ${
                      selectedService === service.id
                        ? "bg-charcoal text-cream shadow-md"
                        : "bg-card text-foreground shadow-sm hover:shadow-md"
                    }`}
                  >
                    <span className="text-2xl">{service.icon}</span>
                    <div className="flex-1">
                      <span className="block text-base font-medium">{service.label}</span>
                      <span className={`text-xs ${selectedService === service.id ? "text-cream/70" : "text-muted-foreground"}`}>
                        {service.duration}
                      </span>
                    </div>
                    {selectedService === service.id && <Check size={18} />}
                  </button>
                ))}
              </div>
            </ScrollReveal>
          )}

          {/* Step 2 — Date & Time */}
          {step === 2 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-6 text-center">
                Elige fecha y hora
              </h2>

              {/* Date scroller */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span className="text-xs font-sans uppercase tracking-wide text-muted-foreground">Fecha</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1.5 px-1.5 scrollbar-hide">
                  {availableDates.map((date) => {
                    const info = formatDate(date);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        className={`flex-shrink-0 w-16 py-3 rounded-lg text-center transition-all duration-200 active:scale-95 ${
                          isSelected
                            ? "bg-charcoal text-cream shadow-md"
                            : "bg-card text-foreground shadow-sm hover:shadow-md"
                        }`}
                      >
                        <span className={`block text-[10px] uppercase tracking-wide ${isSelected ? "text-cream/70" : "text-muted-foreground"}`}>
                          {info.day}
                        </span>
                        <span className="block text-lg font-medium tabular-nums mt-0.5">{info.num}</span>
                        <span className={`block text-[10px] ${isSelected ? "text-cream/70" : "text-muted-foreground"}`}>
                          {info.month}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-sans uppercase tracking-wide text-muted-foreground">Hora disponible</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((time) => {
                      const isOccupied = occupiedSlots.includes(time);
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          disabled={isOccupied}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3 rounded-lg text-sm font-sans tabular-nums transition-all duration-200 active:scale-95 ${
                            isOccupied
                              ? "bg-secondary/50 text-muted-foreground/40 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-charcoal text-cream shadow-md"
                              : "bg-card text-foreground shadow-sm hover:shadow-md"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {occupiedSlots.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Las horas tachadas ya están ocupadas
                    </p>
                  )}
                </div>
              )}
            </ScrollReveal>
          )}

          {/* Step 3 — Contact */}
          {step === 3 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-6 text-center">
                Tus datos de contacto
              </h2>
              <div className="bg-card rounded-lg p-6 shadow-sm space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <User size={14} />
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder="Tu nombre"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <Phone size={14} />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder="600 000 000"
                    autoComplete="tel"
                  />
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground mb-3">Resumen</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Servicio</span>
                    <span className="text-foreground font-medium">
                      {services.find((s) => s.id === selectedService)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="text-foreground font-medium tabular-nums">
                      {selectedDate && `${formatDate(selectedDate).num} ${formatDate(selectedDate).month}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hora</span>
                    <span className="text-foreground font-medium tabular-nums">{selectedTime}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Navigation buttons */}
          <ScrollReveal delay={200}>
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14 text-base gap-2"
                  onClick={() => setStep((step - 1) as Step)}
                >
                  <ArrowLeft size={16} />
                  Atrás
                </Button>
              )}
              {step < 3 ? (
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1 h-14 text-base gap-2"
                  disabled={!canAdvance()}
                  onClick={() => setStep((step + 1) as Step)}
                >
                  Siguiente
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1 h-14 text-base gap-2"
                  disabled={!canAdvance()}
                  onClick={handleSubmit}
                >
                  <Check size={16} />
                  Confirmar Cita
                </Button>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Reservation;
