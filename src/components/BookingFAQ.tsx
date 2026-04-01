import { useLanguage } from "@/i18n/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ScrollReveal from "@/components/ScrollReveal";
import { useAuth } from "@/contexts/AuthContext";
import EditableText from "@/components/cms/EditableText";
import { useServicesPageContent, useUpdateServicesPageContent } from "@/hooks/useServices";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BookingFAQ = () => {
  const { t, lang } = useLanguage();
  const { isEditingView } = useAuth();
  const { data: pageContent } = useServicesPageContent();
  const updatePageContent = useUpdateServicesPageContent();

  const langLabel = lang === "es" ? "Español" : lang === "en" ? "English" : "Euskara";

  // Fallback por defecto si no hay nada guardado en Firebase
  const defaultFaqs = [
    { q: t("booking.faq.parking"), a: t("booking.faq.parkingAnswer") },
    { q: t("booking.faq.payment"), a: t("booking.faq.paymentAnswer") },
    { q: t("booking.faq.cancellation"), a: t("booking.faq.cancellationAnswer") },
  ];

  // Leemos las FAQs de la Base de Datos o usamos las por defecto
  const savedFaqs = pageContent?.[`booking_faqs_${lang}`];
  const faqs = Array.isArray(savedFaqs) && savedFaqs.length > 0 ? savedFaqs : defaultFaqs;

  // Título editable
  const displayTitle = pageContent?.[`booking_faq_title_${lang}`] || t("booking.faq.title");

  // --- LÓGICA DE EDICIÓN ---
  const updateFaq = async (index: number, field: "q" | "a", value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    await updatePageContent.mutateAsync({ [`booking_faqs_${lang}`]: newFaqs });
  };

  const addFaq = async () => {
    const newFaqs = [...faqs, { q: "Nueva pregunta", a: "Escribe aquí la respuesta..." }];
    await updatePageContent.mutateAsync({ [`booking_faqs_${lang}`]: newFaqs });
  };

  const removeFaq = async (index: number) => {
    const newFaqs = faqs.filter((_, i) => i !== index);
    await updatePageContent.mutateAsync({ [`booking_faqs_${lang}`]: newFaqs });
  };

  return (
    <ScrollReveal>
      <div className="mt-12 md:mt-16 max-w-lg mx-auto">
        <div className="text-center mb-4">
          <EditableText
            value={displayTitle}
            onSave={async (val) => await updatePageContent.mutateAsync({ [`booking_faq_title_${lang}`]: val })}
            isEditing={isEditingView}
            as="h3"
            className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark inline-block"
            langLabel={langLabel}
          />
        </div>

        {isEditingView ? (
          // 🔥 VISTA DE EDICIÓN (Modo Admin) - Todo abierto para facilitar la edición
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-card/50 rounded-lg shadow-sm p-4 border border-amber-200 relative group transition-all">
                <button 
                  onClick={() => removeFaq(i)}
                  className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                  title="Eliminar pregunta"
                >
                  <Trash2 size={14} />
                </button>
                <div className="mb-3 pr-8">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Pregunta:</p>
                  <EditableText
                    value={faq.q}
                    onSave={(val) => updateFaq(i, "q", val)}
                    isEditing={true}
                    as="div"
                    className="text-sm font-sans text-foreground font-medium"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Respuesta:</p>
                  <EditableText
                    value={faq.a}
                    onSave={(val) => updateFaq(i, "a", val)}
                    isEditing={true}
                    as="div"
                    className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full border-dashed border-2 hover:bg-sand-light/20 gap-2 text-xs h-12" onClick={addFaq}>
              <Plus size={16} /> Añadir nueva pregunta
            </Button>
          </div>
        ) : (
          // 👁️ VISTA CLIENTE (Modo Normal) - El acordeón original
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-lg shadow-sm border-none px-4">
                <AccordionTrigger className="text-sm font-sans text-foreground hover:no-underline py-4 text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 whitespace-pre-line">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </ScrollReveal>
  );
};

export default BookingFAQ;