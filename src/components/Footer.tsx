const Footer = () => (
  <footer className="border-t border-border bg-warm-white">
    <div className="container py-10 md:py-16">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <span className="font-serif text-2xl tracking-wide text-foreground">AG</span>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
            Peluquería Ana González — cuidado profesional en el corazón de Donostia.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-4">Contacto</h4>
          <address className="not-italic text-sm text-foreground leading-relaxed space-y-1">
            <p>José María Salaberría 33</p>
            <p>20008 Donostia — San Sebastián</p>
            <p className="mt-2">
              <a href="tel:+34943000000" className="text-muted-foreground hover:text-foreground transition-colors">
                Tel: 943 000 000
              </a>
            </p>
          </address>
        </div>
        <div>
          <h4 className="text-xs font-sans uppercase tracking-widest-plus text-muted-foreground mb-4">Horario</h4>
          <div className="text-sm text-foreground leading-relaxed space-y-1">
            <p>Lunes a Viernes: 9:00 — 19:00</p>
            <p>Sábado: 9:00 — 14:00</p>
            <p className="text-muted-foreground">Domingo: Cerrado</p>
          </div>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-border text-center">
        <p className="text-xs text-muted-foreground tracking-wide">
          © {new Date().getFullYear()} AGL Beauty Salon. Todos los derechos reservados.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
