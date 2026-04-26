import ScrollReveal from "@/components/ScrollReveal";

const Cookies = () => (
  <main className="pt-16">
    <section className="py-10 md:py-24">
      <div className="container max-w-4xl">
        <ScrollReveal>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center mb-3" style={{ lineHeight: '1.1' }}>
            Política de Cookies
          </h1>
          <p className="text-center text-sm text-muted-foreground mb-10">
            Última actualización: 24 de abril de 2026
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="prose prose-sm max-w-none text-foreground/90 space-y-8">
            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>¿Qué son las Cookies?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web.
                Nos permiten recordar sus preferencias, analizar el uso del sitio y mejorar su experiencia de navegación.
                También nos ayudan a mostrar contenido relevante y anuncios personalizados.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>Tipos de Cookies que Utilizamos</h2>

              <div className="space-y-6">
                <div className="border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="font-medium text-foreground text-lg">Cookies Técnicas (Necesarias)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Estas cookies son esenciales para el funcionamiento básico de nuestro sitio web.
                    Sin ellas, el sitio no funcionaría correctamente.
                  </p>
                  <div className="bg-muted/30 p-3 rounded text-sm">
                    <strong>Finalidad:</strong> Gestión de sesiones, autenticación de usuarios, seguridad del sitio.<br />
                    <strong>Base jurídica:</strong> Interés legítimo (art. 6.1.f RGPD).<br />
                    <strong>Duración:</strong> Sesión o hasta cierre del navegador.<br />
                    <strong>Proveedores:</strong> AGL Beauty & Wellness.
                  </div>
                </div>

                <div className="border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="font-medium text-foreground text-lg">Cookies Analíticas</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web,
                    recopilando información anónima sobre páginas visitadas, tiempo de navegación
                    y origen del tráfico.
                  </p>
                  <div className="bg-muted/30 p-3 rounded text-sm">
                    <strong>Finalidad:</strong> Análisis de uso del sitio web, mejora de la experiencia del usuario.<br />
                    <strong>Base jurídica:</strong> Consentimiento (art. 6.1.a RGPD).<br />
                    <strong>Duración:</strong> 26 meses (según LSSI-CE).<br />
                    <strong>Proveedores:</strong> Google Analytics (Google LLC), Vercel Analytics (Vercel Inc.).
                  </div>
                </div>

                <div className="border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <h3 className="font-medium text-foreground text-lg">Cookies de Marketing</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Utilizadas para mostrar publicidad relevante y medir la efectividad de nuestras
                    campañas publicitarias. Pueden incluir cookies de redes sociales y plataformas
                    de publicidad externa.
                  </p>
                  <div className="bg-muted/30 p-3 rounded text-sm">
                    <strong>Finalidad:</strong> Publicidad personalizada, remarketing, análisis de conversiones.<br />
                    <strong>Base jurídica:</strong> Consentimiento (art. 6.1.a RGPD).<br />
                    <strong>Duración:</strong> 13 meses.<br />
                    <strong>Proveedores:</strong> Google Ads (Google LLC), Meta Platforms (Facebook, Instagram).
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>¿Cómo Gestionar las Cookies?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Puede gestionar sus preferencias de cookies de las siguientes formas:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-sand-light rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-sand-dark">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Banner de Cookies</h4>
                    <p className="text-sm text-muted-foreground">
                      Al visitar nuestro sitio por primera vez, aparecerá un banner donde podrá aceptar todas las cookies,
                      rechazar las opcionales o configurar sus preferencias.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-sand-light rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-sand-dark">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Configuración del Navegador</h4>
                    <p className="text-sm text-muted-foreground">
                      Puede configurar su navegador para bloquear o eliminar cookies. Tenga en cuenta que esto puede
                      afectar al funcionamiento de muchos sitios web.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-sand-light rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-sand-dark">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Enlace de Preferencias</h4>
                    <p className="text-sm text-muted-foreground">
                      En cualquier momento puede acceder al enlace "Preferencias de Cookies" en el pie de página
                      para modificar sus elecciones.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>Transferencias Internacionales</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Algunos de nuestros proveedores de servicios (como Google LLC o Vercel Inc.) están ubicados
                en Estados Unidos. Estas transferencias están protegidas por las adecuaciones UE-EEUU
                (Privacy Shield) y las cláusulas contractuales tipo de la Comisión Europea.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>Cambios en la Política de Cookies</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Podemos actualizar esta política de cookies para reflejar cambios en nuestros servicios
                o en la legislación aplicable. Le notificaremos cualquier cambio significativo a través
                de nuestro sitio web o por email. La fecha de la última actualización aparece en la parte
                superior de este documento.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-4" style={{ lineHeight: '1.2' }}>Contacto</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Si tiene alguna pregunta sobre nuestra política de cookies o desea ejercer sus derechos,
                puede contactarnos:
              </p>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Email:</strong> info@aglbeauty.com<br />
                  <strong className="text-foreground">Dirección:</strong> José María Salaberría 33, 20008 Donostia — San Sebastián (Gipuzkoa)<br />
                  <strong className="text-foreground">Delegado de Protección de Datos:</strong> dpo@aglbeauty.com
                </p>
              </div>
            </section>

            <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-900 mb-2">⚠️ Información Importante</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                El rechazo de cookies analíticas y de marketing no afectará al funcionamiento básico de nuestro sitio web.
                Sin embargo, algunas funcionalidades avanzadas pueden verse limitadas. Puede cambiar sus preferencias
                en cualquier momento sin que ello afecte a la licitud del tratamiento basado en el consentimiento
                prestado con anterioridad.
              </p>
            </section>
          </div>
        </ScrollReveal>
      </div>
    </section>
  </main>
);

export default Cookies;