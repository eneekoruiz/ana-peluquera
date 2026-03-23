import ScrollReveal from "@/components/ScrollReveal";

const Privacidad = () => (
  <main className="pt-16">
    <section className="py-10 md:py-24">
      <div className="container max-w-2xl">
        <ScrollReveal>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-3" style={{ lineHeight: '1.1' }}>
            Política de Privacidad
          </h1>
          <p className="text-center text-sm text-muted-foreground mb-10">
            Última actualización: marzo 2026
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
            <section>
              <h2 className="font-serif text-lg text-foreground mb-2" style={{ lineHeight: '1.2' }}>1. Responsable del Tratamiento</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">AGL Beauty & Wellness</strong> — Ana González López<br />
                José María Salaberría 33, 20008 Donostia — San Sebastián (Gipuzkoa)<br />
                Contacto: info@aglbeauty.com
              </p>
            </section>

            <section>
              <h2 className="font-serif text-lg text-foreground mb-2" style={{ lineHeight: '1.2' }}>2. Datos Recogidos</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A través del formulario de reserva de citas, recogemos exclusivamente los siguientes datos personales:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Nombre completo</li>
                <li>Número de teléfono</li>
                <li>Dirección de email</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-lg text-foreground mb-2" style={{ lineHeight: '1.2' }}>3. Finalidad del Tratamiento</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sus datos personales serán tratados <strong className="text-foreground">exclusivamente</strong> para:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Gestionar y confirmar su cita en el salón</li>
                <li>Comunicarnos con usted en relación a su reserva (recordatorios, cambios o cancelaciones)</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">No</strong> utilizamos sus datos con fines comerciales, publicitarios ni los compartimos con terceros.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-lg text-foreground mb-2" style={{ lineHeight: '1.2' }}>4. Base Legal</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                El tratamiento de sus datos se basa en el <strong className="text-foreground">consentimiento explícito</strong> que usted otorga 
                al marcar la casilla de aceptación en el formulario de reserva, conforme al artículo 6.1.a) del 
                Reglamento General de Protección de Datos (RGPD) UE 2016/679 y la Ley Orgánica 3/2018 (LOPDGDD).
              </p>
            </section>

            <section>
              <h2 className="font-serif text-lg text-foreground mb-2" style={{ lineHeight: '1.2' }}>5. Conservación de Datos</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Los datos personales se conservarán únicamente durante el tiempo necesario para gestionar su cita 
                y serán eliminados transcurridos 6 meses desde la fecha de la reserva, salvo obligación legal de conservación.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-lg text-foreground mb-2" style={{ lineHeight: '1.2' }}>6. Derechos del Usuario</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Conforme a la normativa vigente, usted tiene derecho a:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li><strong className="text-foreground">Acceso</strong> — Conocer qué datos tenemos sobre usted</li>
                <li><strong className="text-foreground">Rectificación</strong> — Corregir datos inexactos</li>
                <li><strong className="text-foreground">Supresión</strong> — Solicitar la eliminación de sus datos</li>
                <li><strong className="text-foreground">Oposición</strong> — Oponerse al tratamiento de sus datos</li>
                <li><strong className="text-foreground">Portabilidad</strong> — Recibir sus datos en formato estructurado</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                Para ejercer sus derechos, contacte con nosotros en info@aglbeauty.com. 
                También tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es).
              </p>
            </section>

            <section>
              <h2 className="font-serif text-lg text-foreground mb-2" style={{ lineHeight: '1.2' }}>7. Seguridad</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Implementamos medidas técnicas y organizativas para proteger sus datos personales contra 
                acceso no autorizado, pérdida o destrucción.
              </p>
            </section>
          </div>
        </ScrollReveal>
      </div>
    </section>
  </main>
);

export default Privacidad;
