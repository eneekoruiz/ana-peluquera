import ScrollReveal from "@/components/ScrollReveal";

const Privacidad = () => (
  <main className="pt-16">
    <section className="py-10 md:py-24">
      <div className="container max-w-4xl">
        <ScrollReveal>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-3" style={{ lineHeight: '1.1' }}>
            Política de Privacidad y Protección de Datos
          </h1>
          <p className="text-center text-sm text-muted-foreground mb-10">
            Última actualización: 24 de abril de 2026
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="prose prose-sm max-w-none text-foreground/90 space-y-8">
            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>1. Identidad del Responsable del Tratamiento</h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  <strong className="text-foreground">Responsable:</strong> Ana González López (AGL Beauty & Wellness)<br />
                  <strong className="text-foreground">NIF:</strong> 12345678A<br />
                  <strong className="text-foreground">Dirección:</strong> José María Salaberría 33, 20008 Donostia — San Sebastián (Gipuzkoa)<br />
                  <strong className="text-foreground">Email:</strong> info@aglbeauty.com<br />
                  <strong className="text-foreground">Teléfono:</strong> +34 943 123 456<br />
                  <strong className="text-foreground">Actividad:</strong> Servicios de peluquería y estética
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>2. Información y Consentimiento</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                De conformidad con lo dispuesto en el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo,
                de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento
                de datos personales y a la libre circulación de estos datos (RGPD), y la Ley Orgánica 3/2018, de 5 de
                diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), le informamos
                que los datos personales que nos facilite serán tratados conforme a las siguientes finalidades:
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>3. Datos Recogidos y Finalidades</h2>
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-medium text-foreground mb-2">3.1 Datos de Contacto y Reserva</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Categorías de datos:</strong> Nombre completo, número de teléfono, dirección de email, notas adicionales.
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Finalidad:</strong> Gestión y confirmación de citas, envío de recordatorios y comunicaciones relacionadas con el servicio.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Base jurídica:</strong> Ejecución de contrato (art. 6.1.b RGPD) y consentimiento (art. 6.1.a RGPD).
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-medium text-foreground mb-2">3.2 Datos de Navegación Web</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Categorías de datos:</strong> Dirección IP, tipo de navegador, páginas visitadas, tiempo de navegación.
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Finalidad:</strong> Análisis del uso del sitio web y mejora de la experiencia del usuario.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Base jurídica:</strong> Consentimiento (art. 6.1.a RGPD) a través de la política de cookies.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>4. Plazos de Conservación</h2>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li><strong>Datos de reservas:</strong> Se conservarán durante el tiempo necesario para gestionar la cita y 3 años adicionales para atender posibles reclamaciones.</li>
                <li><strong>Datos de navegación:</strong> Los datos analíticos se conservarán durante 26 meses según establece la Ley de Servicios de la Sociedad de la Información.</li>
                <li><strong>Datos de contacto:</strong> Hasta que el interesado solicite su supresión o revoque el consentimiento.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>5. Destinatarios de los Datos</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sus datos personales no serán cedidos a terceros, salvo obligación legal. Utilizamos los siguientes proveedores
                de servicios que actúan como encargados del tratamiento:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li><strong>Vercel Inc.</strong> (hosting web) - Estados Unidos (adecuación UE-EEUU)</li>
                <li><strong>Google LLC</strong> (Google Calendar, Analytics) - Estados Unidos (adecuación UE-EEUU)</li>
                <li><strong>Firebase (Google)</strong> (base de datos) - Estados Unidos (adecuación UE-EEUU)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>6. Derechos de los Interesados</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Puede ejercer los siguientes derechos enviando un email a info@aglbeauty.com o por correo postal:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Derecho de Acceso</h4>
                  <p className="text-xs text-muted-foreground">Conocer qué datos personales tratamos sobre usted.</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Derecho de Rectificación</h4>
                  <p className="text-xs text-muted-foreground">Solicitar la corrección de datos inexactos.</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Derecho de Supresión</h4>
                  <p className="text-xs text-muted-foreground">Solicitar la eliminación de sus datos personales.</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Derecho de Oposición</h4>
                  <p className="text-xs text-muted-foreground">Oponerse al tratamiento de sus datos.</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Derecho a la Portabilidad</h4>
                  <p className="text-xs text-muted-foreground">Obtener sus datos en formato estructurado.</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Derecho de Limitación</h4>
                  <p className="text-xs text-muted-foreground">Limitar el tratamiento de sus datos.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                También puede presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>7. Medidas de Seguridad</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Implementamos medidas técnicas y organizativas apropiadas para garantizar la seguridad, integridad y confidencialidad
                de sus datos personales, incluyendo encriptación SSL/TLS, controles de acceso, copias de seguridad y auditorías de seguridad.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>8. Política de Cookies</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Utilizamos cookies y tecnologías similares para mejorar su experiencia en nuestro sitio web. Puede gestionar
                sus preferencias de cookies en cualquier momento a través del panel de configuración de cookies.
              </p>

              <div className="space-y-3">
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Cookies Técnicas (Necesarias)</h4>
                  <p className="text-xs text-muted-foreground">Esenciales para el funcionamiento del sitio web. No requieren consentimiento.</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Cookies Analíticas</h4>
                  <p className="text-xs text-muted-foreground">Nos ayudan a entender cómo utiliza el sitio web para mejorar nuestros servicios.</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <h4 className="font-medium text-foreground text-sm mb-1">Cookies de Marketing</h4>
                  <p className="text-xs text-muted-foreground">Utilizadas para mostrar publicidad relevante y medir la efectividad de campañas.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>9. Cambios en la Política</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Esta política de privacidad puede ser actualizada. Le notificaremos cualquier cambio significativo a través
                de nuestro sitio web o por email. La fecha de la última actualización aparece en la parte superior de este documento.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>10. Contacto</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para cualquier consulta sobre esta política de privacidad o el tratamiento de sus datos personales,
                puede contactarnos en:
              </p>
              <div className="bg-muted/30 p-4 rounded-lg mt-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Email:</strong> info@aglbeauty.com<br />
                  <strong className="text-foreground">Teléfono:</strong> +34 943 123 456<br />
                  <strong className="text-foreground">Dirección:</strong> José María Salaberría 33, 20008 Donostia — San Sebastián (Gipuzkoa)
                </p>
              </div>
            </section>
          </div>
        </ScrollReveal>
      </div>
    </section>
  </main>
);

export default Privacidad;
