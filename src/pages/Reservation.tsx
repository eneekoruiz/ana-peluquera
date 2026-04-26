import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { toast } from "sonner";
import { Check, ArrowLeft, ArrowRight, User, Phone, Mail, Calendar as CalendarIcon, MessageCircle, Clock, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Scissors, Hand, Sparkles, Paintbrush, Droplets, Palette, Flower2, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useServices, getLocalizedLabel } from "@/hooks/useServices";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { es, enGB, eu } from "date-fns/locale";
import ErrorBoundary from "@/components/ErrorBoundary";

// 🔥 CMS y Cerebro
import EditableText from "@/components/cms/EditableText";
import { useServicesPageContent, useUpdateServicesPageContent } from "@/hooks/useServices";
import { calculateAvailability, Employee } from "@/lib/scheduler";

const iconMap: Record<string, LucideIcon> = {
  scissors: Scissors, hand: Hand, sparkles: Sparkles, paintbrush: Paintbrush,
  droplets: Droplets, palette: Palette, "flower-2": Flower2, "circle-dot": CircleDot,
};

type Step = 1 | 2 | 3 | 4;

const ALL_SLOTS = [
  "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
  "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
  "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30", "15:45", "16:00", "16:15",
  "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30"
];

const DEFAULT_SCHEDULE = [
  { dayId: 1, isActive: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" },
  { dayId: 2, isActive: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" },
  { dayId: 3, isActive: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" },
  { dayId: 4, isActive: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" },
  { dayId: 5, isActive: true, morningStart: "09:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00" },
  { dayId: 6, isActive: true, morningStart: "09:00", morningEnd: "14:00", afternoonStart: "", afternoonEnd: "" },
  { dayId: 0, isActive: false, morningStart: "", morningEnd: "", afternoonStart: "", afternoonEnd: "" },
];

const defaultStaff: Employee[] = [
  { id: "ana_id", name: "Ana", skills: ["peluqueria", "masajes"], priority: 1, schedule: DEFAULT_SCHEDULE },
  { id: "refuerzo_id", name: "Refuerzo", skills: ["peluqueria"], priority: 2, schedule: DEFAULT_SCHEDULE }
];

const timeToMinutes = (t: string) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

const normalizeCategory = (str: string) => 
  str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const getLocalDateStr = (d: Date = new Date()) => {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// URL Dinámica para el backend: Usa localhost en desarrollo, ruta relativa en producción.
const API_BASE_URL = import.meta.env.DEV ? "http://localhost:3001/api" : "/api";

const Reservation = () => {
  // ✅ Estados perfectamente alineados dentro del componente
  const [submitted, setSubmitted] = useState(false);
  const SALON_PHONE = import.meta.env.VITE_SALON_PHONE || "34843673595";
  const PERSONAL_PHONE = import.meta.env.VITE_PERSONAL_PHONE || "34645006964";
  const { isEditingView } = useAuth(); 
  const { lang, t } = useLanguage();
  const { data: dbServices = [], isLoading: loadingServices } = useServices();
  const { data: settings } = useAdminSettings();
  
  const { data: pageContent } = useServicesPageContent();
  const updatePageContent = useUpdateServicesPageContent();
  const langLabel = lang === "es" ? "Español" : lang === "en" ? "English" : "Euskara";
  const calendarLocale = lang === "eu" ? eu : lang === "en" ? enGB : es;

  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    return today;
  });

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitTimedOut, setSubmitTimedOut] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotsLoadingMessage, setSlotsLoadingMessage] = useState("Cargando disponibilidad...");
  const [slotsFetchTimedOut, setSlotsFetchTimedOut] = useState(false);
  const [slotsRetryTick, setSlotsRetryTick] = useState(0);

  const todayStr = getLocalDateStr();
  const dateStr = selectedDate ? getLocalDateStr(selectedDate) : "";
  const service = dbServices.find((s: any) => s.id === selectedServiceId) as any;
  const [dayBookings, setDayBookings] = useState<any[]>([]);
  
  const isEmergencyClosedToday = settings?.today_closed && settings?.today_closed_date === todayStr;

  const isDateDisabled = (date?: Date) => {
    if (!date) return true; 
  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;
    if (date.getDay() === 0) return true; 
    
    const dStr = getLocalDateStr(date);
    if (isEmergencyClosedToday && dStr === todayStr) return true;

    if (settings?.vacation_ranges && settings.vacation_ranges.length > 0) {
      for (const range of settings.vacation_ranges) {
        if (dStr >= range.start && dStr <= range.end) return true;
      }
    }
    
    return false;
  };

  useEffect(() => {
    if (selectedDate && settings && isDateDisabled(selectedDate)) {
      setSelectedDate(undefined);
    }
  }, [settings]);

  useEffect(() => {
    if (!dateStr) {
      setDayBookings([]);
      setSlotsFetchTimedOut(false);
      setSlotsLoadingMessage("Cargando disponibilidad...");
      return;
    }

    const controller = new AbortController();
    let isMounted = true;
    let didTimeoutAbort = false;

    const slowTimer = window.setTimeout(() => {
      if (isMounted) {
        setSlotsLoadingMessage("Sincronizando con el calendario de Ana...");
      }
    }, 4000);

    const timeoutTimer = window.setTimeout(() => {
      didTimeoutAbort = true;
      controller.abort();
    }, 10000);

    const fetchBookings = async () => {
      setIsFetchingSlots(true);
      setSlotsFetchTimedOut(false);
      setSlotsLoadingMessage("Cargando disponibilidad...");

      try {
        const response = await fetch(`${API_BASE_URL}/bookings?date=${dateStr}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Fallo en la red");
        
        const data = await response.json();
        
        const formattedBookings = (Array.isArray(data) ? data : []).map((slot: any) => {
          let st = "00:00";
          let et = "23:59";
          
          if (slot.start_time && !slot.start_time.includes('T')) st = slot.start_time;
          else if (slot.startTime && slot.startTime.includes('T')) st = slot.startTime.split('T')[1].substring(0, 5);
          else if (slot.start && slot.start.includes('T')) st = slot.start.split('T')[1].substring(0, 5);

          if (slot.end_time && !slot.end_time.includes('T')) et = slot.end_time;
          else if (slot.endTime && slot.endTime.includes('T')) et = slot.endTime.split('T')[1].substring(0, 5);
          else if (slot.end && slot.end.includes('T')) et = slot.end.split('T')[1].substring(0, 5);

          return { ...slot, start_time: st, end_time: et };
        });

        if (isMounted) {
          setDayBookings(formattedBookings);
        }
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") {
          if (isMounted && didTimeoutAbort) {
            setSlotsFetchTimedOut(true);
          }
          return;
        }
        console.error("Error cargando disponibilidad:", error);
      } finally {
        window.clearTimeout(slowTimer);
        window.clearTimeout(timeoutTimer);
        if (isMounted) {
          setIsFetchingSlots(false);
        }
      }
    };

    fetchBookings();

    return () => {
      isMounted = false;
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
      controller.abort();
    };
  }, [dateStr, submitted, slotsRetryTick]);

  const currentStaff = (settings as any)?.staff || defaultStaff;

  const { occupiedSlots } = useMemo(() => {
    if (!service || !selectedDate || isFetchingSlots) {
      return { occupiedSlots: new Set<string>(ALL_SLOTS), slotAssignments: {} };
    }

    if (isDateDisabled(selectedDate)) {
      return { occupiedSlots: new Set<string>(ALL_SLOTS), slotAssignments: {} };
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const { occupied, assignments } = calculateAvailability(
      ALL_SLOTS, service, dayBookings, currentStaff, selectedDate, getLocalDateStr(selectedDate) === todayStr, currentMins
    );

    return { occupiedSlots: occupied, slotAssignments: assignments };
  }, [dayBookings, service, selectedDate, settings, isFetchingSlots]); 

  const isDayFull = useMemo(() => {
    if (isFetchingSlots || ALL_SLOTS.length === 0) return false;
    const availableCount = ALL_SLOTS.filter(slot => !occupiedSlots.has(slot)).length;
    return availableCount === 0;
  }, [occupiedSlots, isFetchingSlots]);

  const bookingsDisabled = settings?.bookings_enabled === false;
  const categories = [...new Set(dbServices.map((s: any) => normalizeCategory(s.category)))].filter(Boolean) as string[];
  const catLabels: Record<string, string> = { peluqueria: "Peluquería", masajes: "Masajes & Bienestar" };

  const displayTitle = pageContent?.[`booking_title_${lang}`] || t("booking.title");
  const displaySubtitle = pageContent?.[`booking_subtitle_${lang}`] || t("booking.subtitle");
  const displayStep1 = pageContent?.[`booking_step1_${lang}`] || t("booking.whatNeed");
  const displayStep2 = pageContent?.[`booking_step2_${lang}`] || t("booking.chooseDate");
  const displayStep3 = pageContent?.[`booking_step3_${lang}`] || t("booking.chooseTime");
  const displayStep4 = pageContent?.[`booking_step4_${lang}`] || t("booking.contactData");

  const getCatLabel = (cat: string) => {
    return pageContent?.[`cat_${cat}_${lang}`] || catLabels[cat] || cat;
  };

  const filteredServices = selectedCategory ? dbServices.filter((s: any) => normalizeCategory(s.category) === selectedCategory) : [];

  const canAdvance = () => {
    if (step === 1) return !!selectedServiceId;
    if (step === 2) return !!selectedDate && !isDateDisabled(selectedDate);
    if (step === 3) return !!selectedTime;
    if (step === 4) return name.trim().length >= 2 && phone.trim().length >= 9 && acceptPrivacy;
    return false;
  };

  const handleSubmit = async () => {
    if (!service || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    setSubmitTimedOut(false);
    
    try {
      const fetchWithTimeout = async (url: string, options?: RequestInit, timeoutMs = 10000) => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch(url, { ...options, signal: controller.signal });
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      const selectedDateStr = getLocalDateStr(selectedDate);
      const startMin = timeToMinutes(selectedTime);
      const duration = service.duration_min || service.durationMin || 0;
      const endTimeStr = minutesToTime(startMin + duration);

      const bookingPayload = {
        client_name: name.trim(),
        client_email: email.trim() || null,
        client_phone: phone.trim(),
        service_id: service.id,
        date: selectedDateStr,
        start_time: selectedTime, 
        end_time: endTimeStr, 
        lang: lang,
        phase1Min: service.phase1_min || service.phase1Min || 0,
        phase2Min: service.phase2_min || service.phase2Min || 0,
        phase3Min: service.phase3_min || service.phase3Min || 0
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload)
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error("Horario no disponible", {
          description: responseData.error || "Ese horario acaba de ser ocupado. Elige otro."
        });
        setStep(3);
        const refresh = await fetchWithTimeout(`${API_BASE_URL}/bookings?date=${selectedDateStr}`);
        const freshData = await refresh.json().catch(() => []);
        setDayBookings((Array.isArray(freshData) ? freshData : []).map((slot: any) => ({
          ...slot,
          start_time: (slot.startTime || slot.start_time || slot.start || "").split('T')[1]?.substring(0, 5) || "00:00",
          end_time: (slot.endTime || slot.end_time || slot.end || "").split('T')[1]?.substring(0, 5) || "23:59",
        })));
        return; 
      }

      toast.success("¡Cita reservada con éxito!", { description: "Te esperamos en el salón." });
      setSubmitted(true);

    } catch (error: unknown) {
      if ((error as DOMException)?.name === "AbortError") {
        setSubmitTimedOut(true);
        toast.error("La reserva está tardando demasiado", {
          description: "La conexión se agotó. Vuelve a intentarlo en unos segundos."
        });
        return;
      }
      console.error("Error al hacer la reserva:", error);
      toast.error("Error al reservar", { description: "Hubo un problema de conexión. Inténtalo de nuevo." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getServiceName = (svc: any) => svc?.name || getLocalizedLabel(svc, lang) || svc?.id;

  if (bookingsDisabled) {
    return (
      <main className="pt-16 min-h-screen flex items-center justify-center bg-warm-white">
        <div className="container max-w-md text-center px-6">
          <ScrollReveal>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon size={32} className="text-amber-600" />
            </div>
            <h1 className="font-serif text-3xl text-foreground mb-4">Mantenimiento</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              El sistema de reservas online está pausado temporalmente.
            </p>
          </ScrollReveal>
        </div>
      </main>
    );
  }

  if (submitted && service) {
    const startMin = timeToMinutes(selectedTime || "00:00");
    const duration = service.duration_min || service.durationMin || 0;
    const endTimeStr = minutesToTime(startMin + duration);

    return (
      <main className="pt-16 min-h-screen flex items-center justify-center pb-20">
        <div className="container max-w-md text-center px-6">
          <ScrollReveal>
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
              <Check size={32} className="text-green-600" />
            </div>
            
            <h1 className="font-serif text-3xl text-foreground mb-2" style={{ lineHeight: "1.1" }}>
              ¡Reserva Confirmada!
            </h1>
            <p className="text-muted-foreground mb-8 text-sm">
              Te hemos enviado un email con todos los detalles.
            </p>

            <div className="bg-card rounded-xl p-6 shadow-md border border-border text-left mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-sand-dark"></div>
              
              <div className="border-b border-border pb-4 mb-4">
                <h3 className="font-serif text-lg text-foreground capitalize">{name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{email} • {phone}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Scissors size={14} className="text-sand-dark" /> Servicio
                  </span>
                  <span className="text-foreground font-medium text-right max-w-[60%] truncate">
                    {getServiceName(service)}
                  </span>
                </div>

                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CalendarIcon size={14} className="text-sand-dark" /> Fecha
                  </span>
                  <span className="text-foreground font-medium capitalize tabular-nums">
                    {selectedDate?.toLocaleDateString("es-ES", { weekday: 'long', day: "numeric", month: "long" })}
                  </span>
                </div>

                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock size={14} className="text-sand-dark" /> Horario
                  </span>
                  <div className="text-right">
                    <span className="text-foreground font-medium tabular-nums">{selectedTime} - {endTimeStr}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">({duration} min)</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm items-center pt-2 border-t border-border">
                  <span className="text-muted-foreground font-medium">Precio</span>
                  <span className="text-foreground font-bold text-lg tabular-nums">
                    {service?.price ? `${service.price}€` : "Consultar precio"}
                  </span>
                </div>
              </div>
            </div>

            {service?.price && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-sm text-amber-900 mb-2">Información de Pago</h3>
                <p className="text-xs text-amber-800 mb-2">
                  El pago se realiza en el salón. Aceptamos efectivo, tarjeta y Bizum.
                </p>
                <div className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-300">
                  <span className="text-xs text-amber-900">Bizum:</span>
                  <span className="font-mono text-sm font-bold text-amber-900">843 67 35 95</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                variant="hero"
                className="w-full h-12 text-sm font-medium"
                onClick={() => {
                  setSubmitted(false);
                  setStep(1);
                  setSelectedServiceId(null);
                  setSelectedTime(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Plus size={16} className="mr-2" /> Hacer otra reserva
              </Button>

              <Button variant="outline" className="w-full h-12 text-sm font-medium" asChild>
                <Link to="/">Volver al inicio</Link>
              </Button>
            </div>
            
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
            <div className="text-center mb-2">
              <EditableText
                value={displayTitle}
                onSave={async (val) => await updatePageContent.mutateAsync({ [`booking_title_${lang}`]: val })}
                isEditing={isEditingView}
                as="h1"
                className="font-serif text-3xl md:text-4xl text-foreground inline-block"
                style={{ lineHeight: "1.1" }}
                langLabel={langLabel}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground mb-8">
              <EditableText
                value={displaySubtitle}
                onSave={async (val) => await updatePageContent.mutateAsync({ [`booking_subtitle_${lang}`]: val })}
                isEditing={isEditingView}
                as="span"
                className="inline-block"
                langLabel={langLabel}
              />
            </div>
          </ScrollReveal>

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

          {step === 1 && (
            <ScrollReveal>
              <div className="text-center mb-6">
                <EditableText
                  value={displayStep1}
                  onSave={async (val) => await updatePageContent.mutateAsync({ [`booking_step1_${lang}`]: val })}
                  isEditing={isEditingView}
                  as="h2"
                  className="font-serif text-xl text-foreground inline-block"
                  langLabel={langLabel}
                />
              </div>
              {loadingServices ? (
                <div className="flex justify-center items-center py-6">
                   <div className="w-6 h-6 border-2 border-sand-dark/20 border-t-sand-dark rounded-full animate-spin mr-3"></div>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 mb-6">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { if (!isEditingView) { setSelectedCategory(cat); setSelectedServiceId(null); } }}
                        className={`flex-1 py-3.5 rounded-lg text-xs font-sans uppercase tracking-widest-plus transition-all duration-200 ${!isEditingView ? 'active:scale-[0.97]' : ''} ${
                          selectedCategory === cat
                            ? "bg-charcoal text-cream shadow-md"
                            : "bg-card text-muted-foreground shadow-sm hover:shadow-md"
                        }`}
                      >
                        <EditableText
                          value={getCatLabel(cat)}
                          onSave={async (val) => await updatePageContent.mutateAsync({ [`cat_${cat}_${lang}`]: val })}
                          isEditing={isEditingView}
                          as="span"
                          langLabel={langLabel}
                        />
                      </button>
                    ))}
                  </div>
                  {selectedCategory && (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredServices.map((svc: any) => {
                        const Icon = iconMap[svc.icon_name] || Scissors;
                        const isSelected = selectedServiceId === svc.id;
                        const name = getServiceName(svc);
                        const duration = svc.duration_min || svc.durationMin || 0;
                        const priceStr = svc.price_cents
                          ? `${svc.price_from ? "Desde " : ""}${(svc.price_cents / 100).toFixed(0)}€`
                          : svc.price ? `${svc.price_from ? "Desde " : ""}${svc.price}€` : "";

                        return (
                          <button
                            key={svc.id}
                            onClick={() => { if(!isEditingView) setSelectedServiceId(svc.id); }}
                            className={`flex items-center gap-4 p-5 rounded-lg text-left transition-all duration-200 ${!isEditingView ? 'active:scale-[0.98]' : ''} ${
                              isSelected ? "bg-charcoal text-cream shadow-md" : "bg-card text-foreground shadow-sm hover:shadow-md"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-cream/10" : "bg-sand-light/50"
                            }`}>
                              <Icon size={18} className={isSelected ? "text-cream" : "text-sand-dark"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-base font-medium">{name}</span>
                              <span className={`text-xs ${isSelected ? "text-cream/70" : "text-muted-foreground"}`}>
                                {duration} min {priceStr && `· ${priceStr}`}
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

          {step === 2 && (
            <ScrollReveal>
              <div className="text-center mb-6">
                <EditableText
                  value={displayStep2}
                  onSave={async (val) => await updatePageContent.mutateAsync({ [`booking_step2_${lang}`]: val })}
                  isEditing={isEditingView}
                  as="h2"
                  className="font-serif text-xl text-foreground inline-block"
                  langLabel={langLabel}
                />
              </div>

              <div className="flex justify-center mb-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => { 
                    if(date && !isEditingView) {
                      setSelectedDate(date); 
                      setSelectedTime(null); 
                    }
                  }}
                  disabled={isDateDisabled}
                  locale={calendarLocale} 
                  weekStartsOn={1} 
                  className={`bg-card rounded-lg shadow-sm p-4 ${!isEditingView ? 'pointer-events-auto' : 'opacity-75 pointer-events-none'}`}
                />
              </div>
            </ScrollReveal>
          )}

          {step === 3 && (
            <ScrollReveal>
              <div className="text-center mb-2">
                <EditableText
                  value={displayStep3}
                  onSave={async (val) => await updatePageContent.mutateAsync({ [`booking_step3_${lang}`]: val })}
                  isEditing={isEditingView}
                  as="h2"
                  className="font-serif text-xl text-foreground inline-block"
                  langLabel={langLabel}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground mb-6 capitalize tabular-nums">
                {selectedDate?.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              
              <div className="min-h-[260px] flex flex-col">
                {isFetchingSlots ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 px-6 text-center animate-in fade-in duration-300">
                    <div className="w-10 h-10 border-2 border-sand-dark/20 border-t-sand-dark rounded-full animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">{slotsLoadingMessage}</p>
                  </div>
                ) : slotsFetchTimedOut ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 px-6 text-center animate-in zoom-in-95 duration-500 bg-amber-50/40 rounded-xl border border-amber-200">
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                      <Clock size={22} className="text-amber-700" />
                    </div>
                    <h3 className="font-serif text-lg text-foreground mb-2">Esta agenda va un poco lenta</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">
                      ¡Uy! Esto está tardando más de lo normal. Nuestra agenda digital está muy solicitada. Para no hacerte esperar, pulsa aquí y te agendamos directamente.
                    </p>
                    <div className="w-full flex flex-col gap-3 max-w-xs">
                      <Button variant="hero" className="w-full h-11" asChild>
                        <a href={`https://wa.me/${PERSONAL_PHONE}`} target="_blank" rel="noopener noreferrer">
                          <MessageCircle size={16} className="mr-2" /> Agendar por WhatsApp
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSlotsRetryTick((v) => v + 1)}>
                        Reintentar
                      </Button>
                    </div>
                  </div>
                ) : isDayFull ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 px-6 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                       <CalendarIcon size={24} className="text-amber-600/50" />
                    </div>
                    <h3 className="font-serif text-lg text-foreground mb-2">Día completo</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      Lo sentimos, no quedan huecos para este servicio hoy. 
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                      <ArrowLeft size={14} className="mr-2" /> Elegir otro día
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 animate-in fade-in duration-500">
                    {ALL_SLOTS.map((time) => {
                      const isOccupied = occupiedSlots.has(time);
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          disabled={isOccupied || isEditingView}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3.5 rounded-lg text-sm font-sans tabular-nums transition-all duration-200 ${!isEditingView ? 'active:scale-95' : ''} ${
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
                )}
              </div>
            </ScrollReveal>
          )}

          {step === 4 && (
            <ScrollReveal>
              <div className="text-center mb-6">
                <EditableText
                  value={displayStep4}
                  onSave={async (val) => await updatePageContent.mutateAsync({ [`booking_step4_${lang}`]: val })}
                  isEditing={isEditingView}
                  as="h2"
                  className="font-serif text-xl text-foreground inline-block"
                  langLabel={langLabel}
                />
              </div>
              <div className="bg-card rounded-lg p-6 shadow-sm space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <User size={14} /> {t("booking.name")}
                  </label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isEditingView}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder={t("booking.namePlaceholder")} autoComplete="name" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <Phone size={14} /> {t("booking.phone")}
                  </label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isEditingView}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder="600 000 000" autoComplete="tel" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-sans uppercase tracking-wide text-muted-foreground mb-2">
                    <Mail size={14} /> Email
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isEditingView}
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-base font-sans text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    placeholder="tu@email.com" autoComplete="email" />
                </div>
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} disabled={isEditingView}
                      className="mt-1 w-5 h-5 rounded border-border text-sand-dark focus:ring-ring shrink-0" />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {t("booking.privacyText")}{" "}
                      <Link to="/privacidad" target="_blank" className="underline text-foreground hover:text-sand-dark transition-colors">
                        {t("booking.privacyLink")}
                      </Link>.
                    </span>
                  </label>
                </div>
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal delay={200}>
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button variant="outline" size="lg" className="flex-1 h-14 text-base gap-2"
                  disabled={isEditingView}
                  onClick={() => setStep((step - 1) as Step)}>
                  <ArrowLeft size={16} /> {t("booking.back")}
                </Button>
              )}
              {step < totalSteps ? (
                <Button variant="hero" size="lg" className="flex-1 h-14 text-base gap-2"
                  disabled={!canAdvance() || isEditingView || (step === 3 && isDayFull)} 
                  onClick={() => setStep((step + 1) as Step)}>
                  {t("booking.next")} <ArrowRight size={16} />
                </Button>
              ) : (
                <Button variant="hero" size="lg" className="flex-1 h-14 text-base gap-2"
                  disabled={!canAdvance() || isSubmitting || isEditingView} onClick={handleSubmit}>
                  {isSubmitting ? "Procesando..." : <><Check size={16} /> {t("booking.confirm")}</>}
                </Button>
              )}
            </div>
            {submitTimedOut && step === 4 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-left animate-in fade-in duration-300">
                <p className="text-sm text-foreground leading-relaxed mb-3">
                  ¡Uy! Esto está tardando más de lo normal. Para no hacerte esperar, te agendamos por WhatsApp en un momento.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href={`https://wa.me/${PERSONAL_PHONE}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={16} className="mr-2" /> Agendar por WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

const ReservationWithErrorBoundary = () => (
  <ErrorBoundary>
    <Reservation />
  </ErrorBoundary>
);

export default ReservationWithErrorBoundary;