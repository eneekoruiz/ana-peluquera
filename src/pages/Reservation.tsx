import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Check, ArrowLeft, ArrowRight, User, Phone, Mail, Calendar as CalendarIcon, MessageCircle, CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { services, categoryLabels, type ServiceCategory } from "@/lib/services-data";

type Step = 1 | 2 | 3 | 4;

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30", "18:00", "18:30",
];

// Mock occupied slots
const occupiedSlots = ["10:00", "11:00", "15:30", "16:00"];

const categories: ServiceCategory[] = ["peluqueria", "masajes"];

const Reservation = () => {
  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category === selectedCategory)
    : [];

  const canAdvance = () => {
    if (step === 1) return !!selectedService;
    if (step === 2) return !!selectedDate;
    if (step === 3) return !!selectedTime;
    if (step === 4) return name.trim().length >= 2 && phone.trim().length >= 9 && acceptPrivacy;
    return false;
  };

  const handleSubmit = () => {
    toast.success("¡Cita reservada con éxito!", {
      description: "Recibirás un email de confirmación.",
    });
    setSubmitted(true);
  };

  const service = services.find((s) => s.id === selectedService);

  if (submitted) {
    return (
      <main className="pt-16 min-h-screen flex items-center justify-center">
        <div className="container max-w-md text-center px-6">
          <ScrollReveal>
            <div className="w-24 h-24 rounded-full bg-green-50 mx-auto mb-8 flex items-center justify-center">
              <Check size={40} className="text-green-600" />
            </div>
            <h1 className="font-serif text-3xl text-foreground mb-3" style={{ lineHeight: "1.1" }}>
              ¡Reserva Confirmada!
            </h1>
            <p className="text-muted-foreground mb-8">Te esperamos en el salón</p>
            <div className="bg-card rounded-lg p-6 shadow-sm text-left space-y-3 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Servicio</span>
                <span className="text-foreground font-medium">{service?.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fecha</span>
                <span className="text-foreground font-medium tabular-nums">
                  {selectedDate?.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hora</span>
                <span className="text-foreground font-medium tabular-nums">{selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duración</span>
                <span className="text-foreground font-medium">{service?.duration}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button variant="hero" size="lg" className="w-full h-14 text-base gap-2" asChild>
                <a
                  href={`https://wa.me/34943000000?text=${encodeURIComponent(`Hola, he reservado ${service?.label} el ${selectedDate?.toLocaleDateString("es-ES")} a las ${selectedTime}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={18} />
                  Contactar por WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="lg" className="w-full h-14 text-base gap-2">
                <CalendarPlus size={18} />
                Añadir a Mi Calendario
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              José María Salaberría 33, Donostia
            </p>
          </ScrollReveal>
        </div>
      </main>
    );
  }

  const totalSteps = 4;

  return (
    <main className="pt-16">
      <section className="py-10 md:py-20">
        <div className="container max-w-lg">
          <ScrollReveal>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-2" style={{ lineHeight: "1.1" }}>
              Reserva Tu Cita
            </h1>
            <p className="text-center text-sm text-muted-foreground mb-8">
              Sin registro — solo unos datos y listo
            </p>
          </ScrollReveal>

          {/* Progress */}
          <ScrollReveal delay={100}>
            <div className="flex items-center gap-2 mb-8 max-w-xs mx-auto">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const s = i + 1;
                return (
                  <div key={s} className="flex-1 flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-medium transition-colors duration-300 ${
                        step >= s ? "bg-charcoal text-cream" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {step > s ? <Check size={14} /> : s}
                    </div>
                    {s < totalSteps && (
                      <div className={`flex-1 h-px transition-colors duration-300 ${step > s ? "bg-charcoal" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          {/* Step 1 — Category + Service */}
          {step === 1 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-6 text-center">
                ¿Qué necesitas?
              </h2>

              {/* Category selector */}
              <div className="flex gap-3 mb-6">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setSelectedService(null); }}
                    className={`flex-1 py-3.5 rounded-lg text-xs font-sans uppercase tracking-widest-plus transition-all duration-200 active:scale-[0.97] ${
                      selectedCategory === cat
                        ? "bg-charcoal text-cream shadow-md"
                        : "bg-card text-muted-foreground shadow-sm hover:shadow-md"
                    }`}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>

              {/* Service list */}
              {selectedCategory && (
                <div className="grid grid-cols-1 gap-3">
                  {filteredServices.map((svc) => {
                    const Icon = svc.icon;
                    return (
                      <button
                        key={svc.id}
                        onClick={() => setSelectedService(svc.id)}
                        className={`flex items-center gap-4 p-5 rounded-lg text-left transition-all duration-200 active:scale-[0.98] ${
                          selectedService === svc.id
                            ? "bg-charcoal text-cream shadow-md"
                            : "bg-card text-foreground shadow-sm hover:shadow-md"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedService === svc.id ? "bg-cream/10" : "bg-sand-light/50"
                        }`}>
                          <Icon size={18} className={selectedService === svc.id ? "text-cream" : "text-sand-dark"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-base font-medium">{svc.label}</span>
                          <span className={`text-xs ${selectedService === svc.id ? "text-cream/70" : "text-muted-foreground"}`}>
                            {svc.duration}
                          </span>
                        </div>
                        {selectedService === svc.id && <Check size={18} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollReveal>
          )}

          {/* Step 2 — Monthly Calendar */}
          {step === 2 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-6 text-center">
                Elige la fecha
              </h2>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => { setSelectedDate(date); setSelectedTime(null); }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || date.getDay() === 0; // disable past & Sundays
                  }}
                  className="pointer-events-auto bg-card rounded-lg shadow-sm p-4"
                />
              </div>
              {selectedDate && (
                <p className="text-center text-sm text-foreground mt-4 tabular-nums">
                  {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              )}
            </ScrollReveal>
          )}

          {/* Step 3 — Time slots */}
          {step === 3 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-2 text-center">
                Elige la hora
              </h2>
              <p className="text-center text-xs text-muted-foreground mb-6 capitalize tabular-nums">
                {selectedDate?.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((time) => {
                  const isOccupied = occupiedSlots.includes(time);
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      disabled={isOccupied}
                      onClick={() => setSelectedTime(time)}
                      className={`py-3.5 rounded-lg text-sm font-sans tabular-nums transition-all duration-200 active:scale-95 ${
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
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Las horas tachadas ya están ocupadas
                </p>
              )}
            </ScrollReveal>
          )}

          {/* Step 4 — Contact + GDPR */}
          {step === 4 && (
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
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <Mail size={14} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                </div>

                {/* GDPR Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptPrivacy}
                      onChange={(e) => setAcceptPrivacy(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-border text-sand-dark focus:ring-ring shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      He leído y acepto la{" "}
                      <Link to="/privacidad" target="_blank" className="underline text-foreground hover:text-sand-dark transition-colors">
                        Política de Privacidad
                      </Link>
                      . Mis datos serán tratados exclusivamente para la gestión de mi cita.
                    </span>
                  </label>
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground mb-3">Resumen</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Servicio</span>
                    <span className="text-foreground font-medium">{service?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="text-foreground font-medium tabular-nums">
                      {selectedDate?.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hora</span>
                    <span className="text-foreground font-medium tabular-nums">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duración</span>
                    <span className="text-foreground font-medium">{service?.duration}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Navigation */}
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
              {step < totalSteps ? (
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
