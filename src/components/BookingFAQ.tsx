import { useLanguage } from "@/i18n/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ScrollReveal from "@/components/ScrollReveal";

const BookingFAQ = () => {
  const { t } = useLanguage();

  const faqs = [
    { q: t("booking.faq.parking"), a: t("booking.faq.parkingAnswer") },
    { q: t("booking.faq.payment"), a: t("booking.faq.paymentAnswer") },
    { q: t("booking.faq.cancellation"), a: t("booking.faq.cancellationAnswer") },
  ];

  return (
    <ScrollReveal>
      <div className="mt-12 md:mt-16 max-w-lg mx-auto">
        <h3 className="text-[10px] font-sans uppercase tracking-widest-plus text-sand-dark mb-4 text-center">
          {t("booking.faq.title")}
        </h3>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-lg shadow-sm border-none px-4">
              <AccordionTrigger className="text-sm font-sans text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </ScrollReveal>
  );
};

export default BookingFAQ;
