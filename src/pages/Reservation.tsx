import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Check, ArrowLeft, ArrowRight, User, Phone, Mail, Calendar as CalendarIcon, MessageCircle, CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import BookingFAQ from "@/components/BookingFAQ";
import { Scissors, Hand, Sparkles, Paintbrush, Droplets, Palette, Flower2, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useServices, getLocalizedLabel, getLocalizedDescription, type DBService } from "@/hooks/useServices";
import { useBookingsByDate, useCreateBooking } from "@/hooks/useBookings";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useLanguage } from "@/i18n/LanguageContext";

const iconMap: Record<string, LucideIcon> = {
  scissors: Scissors, hand: Hand, sparkles: Sparkles, paintbrush: Paintbrush,
  droplets: Droplets, palette: Palette, "flower-2": Flower2, "circle-dot": CircleDot,
};

type Step = 1 | 2 | 3 | 4;

const ALL_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30", "18:00", "18:30",
];

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

const Reservation = () => {
  const { lang, t } = useLanguage();
  const { data: dbServices = [], isLoading: loadingServices } = useServices();
  const { data: settings } = useAdminSettings();
  const createBooking = useCreateBooking();

  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dateStr = selectedDate ? selectedDate.toISOString().slice(0, 10) : "";
  const { data: dayBookings = [] } = useBookingsByDate(dateStr);

  const service = dbServices.find((s) => s.id === selectedServiceId);
  const categories = [...new Set(dbServices.map((s) => s.category))];
  const catLabels: Record<string, string> = { peluqueria: "Peluquería", masajes: "Masajes & Bienestar" };

  // Calculate occupied slots based on existing bookings and service duration
  const occupiedSlots = useMemo(() => {
    if (!service) return new Set<string>();
    const occupied = new Set<string>();
    const serviceDuration = service.duration_min;

    for (const booking of dayBookings) {
      if (booking.status === "cancelled") continue;
      const bStart = timeToMinutes(booking.start_time);
      const bEnd = timeToMinutes(booking.end_time);

      // If booking has sandwich and phase2 is released, only block phase1+phase3
      const isPhase2Free = booking.phase2_released;

      for (const slot of ALL_SLOTS) {
        const slotStart = timeToMinutes(slot);
        const slotEnd = slotStart + serviceDuration;

        if (isPhase2Free) {
          // Only block if overlaps with phase1 or phase3 (not phase2)
          // Approximate: phase1 = bStart..bStart+phase1, phase3 = bEnd-phase3..bEnd
          // For simplicity, block the full range minus phase2
          if (slotStart < bEnd && slotEnd > bStart) {
            // More nuanced: allow if the slot fits entirely within the phase2 window
            // We don't have phase details on the booking itself, so just check overlap
            occupied.add(slot);
          }
        } else {
          if (slotStart < bEnd && slotEnd > bStart) {
            occupied.add(slot);
          }
        }
      }
    }
    return occupied;
  }, [dayBookings, service]);

  // Check if bookings are disabled
  const bookingsDisabled = settings?.bookings_enabled === false;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isTodayClosed = settings?.today_closed && settings?.today_closed_date === todayStr;

  const isDateInVacation = (date: Date) => {
    if (!settings?.vacation_start || !settings?.vacation_end) return false;
    const d = date.toISOString().slice(0, 10);
    return d >= settings.vacation_start && d <= settings.vacation_end;
  };

  const filteredServices = selectedCategory
    ? dbServices.filter((s) => s.category === selectedCategory)
    : [];

  const canAdvance = () => {
    if (step === 1) return !!selectedServiceId;
    if (step === 2) return !!selectedDate;
    if (step === 3) return !!selectedTime;
    if (step === 4) return name.trim().length >= 2 && phone.trim().length >= 9 && acceptPrivacy;
    return false;
  };

  const handleSubmit = () => {
    if (!service || !selectedDate || !selectedTime) return;
    const startMin = timeToMinutes(selectedTime);
    const endTime = minutesToTime(startMin + service.duration_min);

    createBooking.mutate(
      {
        service_id: service.id,
        booking_date: dateStr,
        start_time: selectedTime,
        end_time: endTime,
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim() || undefined,
        current_phase: service.phase1_min ? "phase1" : "active",
      },
      {
        onSuccess: () => {
          toast.success("¡Cita reservada con éxito!", { description: "Recibirás confirmación pronto." });
          setSubmitted(true);
        },
        onError: (err) => toast.error(err.message || "Error al reservar"),
      }
    );
  };

  if (bookingsDisabled) {
    return (
      <main className="pt-16 min-h-screen flex items-center justify-center">
        <div className="container max-w-md text-center px-6">
          <ScrollReveal>
            <h1 className="font-serif text-3xl text-foreground mb-3">Reservas Pausadas</h1>
            <p className="text-muted-foreground">Las reservas online están temporalmente desactivadas. Llámanos para reservar.</p>
          </ScrollReveal>
        </div>
      </main>
    );
  }

  if (submitted && service) {
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
                <span className="text-foreground font-medium">{getLocalizedLabel(service, lang)}</span>
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
                <span className="text-foreground font-medium">{service.duration_min} min</span>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="hero" size="lg" className="w-full h-14 text-base gap-2" asChild>
                <a
                  href={`https://wa.me/34943000000?text=${encodeURIComponent(`Hola, he reservado ${getLocalizedLabel(service, lang)} el ${selectedDate?.toLocaleDateString("es-ES")} a las ${selectedTime}`)}`}
                  target="_blank" rel="noopener noreferrer"
                >
                  <MessageCircle size={18} /> Contactar por WhatsApp
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">José María Salaberría 33, Donostia</p>
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
              {t("booking.title")}
            </h1>
            <p className="text-center text-sm text-muted-foreground mb-8">
              {t("booking.subtitle")}
            </p>
          </ScrollReveal>

          {/* Progress */}
          <ScrollReveal delay={100}>
            <div className="flex items-center gap-2 mb-8 max-w-xs mx-auto">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const s = i + 1;
                return (
                  <div key={s} className="flex-1 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-medium transition-colors duration-300 ${
                      step >= s ? "bg-charcoal text-cream" : "bg-secondary text-muted-foreground"
                    }`}>
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
                {t("booking.whatNeed")}
              </h2>
              {loadingServices ? (
                <p className="text-center text-sm text-muted-foreground">Cargando servicios…</p>
              ) : (
                <>
                  <div className="flex gap-3 mb-6">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); setSelectedServiceId(null); }}
                        className={`flex-1 py-3.5 rounded-lg text-xs font-sans uppercase tracking-widest-plus transition-all duration-200 active:scale-[0.97] ${
                          selectedCategory === cat
                            ? "bg-charcoal text-cream shadow-md"
                            : "bg-card text-muted-foreground shadow-sm hover:shadow-md"
                        }`}
                      >
                        {catLabels[cat] || cat}
                      </button>
                    ))}
                  </div>
                  {selectedCategory && (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredServices.map((svc) => {
                        const Icon = iconMap[svc.icon_name] || Scissors;
                        const isSelected = selectedServiceId === svc.id;
                        const priceStr = svc.price_cents
                          ? `${svc.price_from ? "Desde " : ""}${(svc.price_cents / 100).toFixed(0)}€`
                          : "";
                        return (
                          <button
                            key={svc.id}
                            onClick={() => setSelectedServiceId(svc.id)}
                            className={`flex items-center gap-4 p-5 rounded-lg text-left transition-all duration-200 active:scale-[0.98] ${
                              isSelected ? "bg-charcoal text-cream shadow-md" : "bg-card text-foreground shadow-sm hover:shadow-md"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-cream/10" : "bg-sand-light/50"
                            }`}>
                              <Icon size={18} className={isSelected ? "text-cream" : "text-sand-dark"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-base font-medium">{getLocalizedLabel(svc, lang)}</span>
                              <span className={`text-xs ${isSelected ? "text-cream/70" : "text-muted-foreground"}`}>
                                {svc.duration_min} min {priceStr && `· ${priceStr}`}
                              </span>
                            </div>
                            {isSelected && <Check size={18} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </ScrollReveal>
          )}

          {/* Step 2 — Calendar */}
          {step === 2 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-6 text-center">
                {t("booking.chooseDate")}
              </h2>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => { setSelectedDate(date); setSelectedTime(null); }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) return true;
                    if (date.getDay() === 0) return true;
                    if (isDateInVacation(date)) return true;
                    const dStr = date.toISOString().slice(0, 10);
                    if (isTodayClosed && dStr === todayStr) return true;
                    return false;
                  }}
                  className="pointer-events-auto bg-card rounded-lg shadow-sm p-4"
                />
              </div>
              {selectedDate && (
                <p className="text-center text-sm text-foreground mt-4 tabular-nums">
                  {selectedDate.toLocaleDateString(lang === "eu" ? "eu" : lang === "en" ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              )}
            </ScrollReveal>
          )}

          {/* Step 3 — Time */}
          {step === 3 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-2 text-center">
                {t("booking.chooseTime")}
              </h2>
              <p className="text-center text-xs text-muted-foreground mb-6 capitalize tabular-nums">
                {selectedDate?.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {ALL_SLOTS.map((time) => {
                  const isOccupied = occupiedSlots.has(time);
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
            </ScrollReveal>
          )}

          {/* Step 4 — Contact */}
          {step === 4 && (
            <ScrollReveal>
              <h2 className="font-serif text-xl text-foreground mb-6 text-center">
                {t("booking.contactData")}
              </h2>
              <div className="bg-card rounded-lg p-6 shadow-sm space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <User size={14} /> {t("booking.name")}
                  </label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder={t("booking.namePlaceholder")} autoComplete="name" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <Phone size={14} /> {t("booking.phone")}
                  </label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder="600 000 000" autoComplete="tel" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <Mail size={14} /> Email
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder="tu@email.com" autoComplete="email" />
                </div>
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-border text-sand-dark focus:ring-ring shrink-0" />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {t("booking.privacyText")}{" "}
                      <Link to="/privacidad" target="_blank" className="underline text-foreground hover:text-sand-dark transition-colors">
                        {t("booking.privacyLink")}
                      </Link>.
                    </span>
                  </label>
                </div>
                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground mb-3">{t("booking.summary")}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("booking.service")}</span>
                    <span className="text-foreground font-medium">{service ? getLocalizedLabel(service, lang) : ""}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("booking.date")}</span>
                    <span className="text-foreground font-medium tabular-nums">
                      {selectedDate?.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("booking.time")}</span>
                    <span className="text-foreground font-medium tabular-nums">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("booking.duration")}</span>
                    <span className="text-foreground font-medium">{service?.duration_min} min</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Navigation */}
          <ScrollReveal delay={200}>
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button variant="outline" size="lg" className="flex-1 h-14 text-base gap-2"
                  onClick={() => setStep((step - 1) as Step)}>
                  <ArrowLeft size={16} /> {t("booking.back")}
                </Button>
              )}
              {step < totalSteps ? (
                <Button variant="hero" size="lg" className="flex-1 h-14 text-base gap-2"
                  disabled={!canAdvance()} onClick={() => setStep((step + 1) as Step)}>
                  {t("booking.next")} <ArrowRight size={16} />
                </Button>
              ) : (
                <Button variant="hero" size="lg" className="flex-1 h-14 text-base gap-2"
                  disabled={!canAdvance() || createBooking.isPending} onClick={handleSubmit}>
                  <Check size={16} /> {t("booking.confirm")}
                </Button>
              )}
            </div>
          </ScrollReveal>

          {/* FAQ */}
          <BookingFAQ />
        </div>
      </section>
    </main>
  );
};

export default Reservation;
