import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, Settings, X, Check, Shield, Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

// Declaramos solo lo que NO choca con las librerías oficiales (como Vercel)
declare global {
  interface Window {
    updateCookieConsent?: (preferences: any) => void;
    gtag?: (...args: any[]) => void;
  }
}

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
  });
  const { t } = useLanguage();

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    const consentDate = localStorage.getItem('cookie-consent-date');

    if (!consent) {
      setShowBanner(true);
    } else {
      try {
        const savedPreferences = JSON.parse(consent);
        setPreferences(savedPreferences);

        // Check if consent is older than 12 months (GDPR requirement)
        if (consentDate) {
          const consentTimestamp = new Date(consentDate).getTime();
          const twelveMonthsAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

          if (consentTimestamp < twelveMonthsAgo) {
            setShowBanner(true);
          }
        }
      } catch (error) {
        // BLINDAJE: Si hay datos antiguos corruptos, limpiamos y mostramos banner
        localStorage.removeItem('cookie-consent');
        localStorage.removeItem('cookie-consent-date');
        setShowBanner(true);
      }
    }
  }, []);

  const acceptAll = () => {
    const allPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allPreferences);
    localStorage.setItem('cookie-consent', JSON.stringify(allPreferences));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);

    // Enable analytics if accepted
    if (allPreferences.analytics) {
      enableAnalytics();
    }
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(necessaryOnly);
    localStorage.setItem('cookie-consent', JSON.stringify(necessaryOnly));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
  };

  const savePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
    setShowSettings(false);

    // Apply preferences
    if (preferences.analytics) {
      enableAnalytics();
    }
  };

  const enableAnalytics = () => {
    // Update global cookie consent
    if (window.updateCookieConsent) {
      window.updateCookieConsent(preferences);
    }
  };

  const withdrawConsent = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(necessaryOnly);
    localStorage.setItem('cookie-consent', JSON.stringify(necessaryOnly));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(true);
    setShowSettings(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="container max-w-6xl mx-auto p-4">
        {!showSettings ? (
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-12 h-12 bg-sand-light rounded-full flex items-center justify-center">
                <Cookie size={24} className="text-sand-dark" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2 text-lg">Política de Cookies</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Utilizamos cookies propias y de terceros para mejorar nuestros servicios, analizar el tráfico web
                y personalizar el contenido. Puede aceptar todas las cookies, rechazar las no necesarias o
                configurar sus preferencias. Para más información, consulte nuestra{" "}
                <Link to="/privacidad" className="text-sand-dark hover:underline font-medium">
                  política de privacidad
                </Link>.
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield size={12} />
                  RGPD Compliant
                </span>
                <span className="flex items-center gap-1">
                  <Info size={12} />
                  LSSI-CE Compliant
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <Settings size={16} className="mr-2" />
                Configurar
              </Button>
              <Button variant="outline" size="sm" onClick={acceptNecessary}>
                Solo necesarias
              </Button>
              <Button size="sm" onClick={acceptAll}>
                Aceptar todas
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-lg">Preferencias de Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Configure qué tipos de cookies desea aceptar. Las cookies necesarias son obligatorias para el funcionamiento del sitio web.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X size={16} />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 border border-border rounded-lg bg-muted/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-foreground text-sm">Cookies Técnicas (Necesarias)</h4>
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esenciales para el funcionamiento básico del sitio web. Incluyen cookies de sesión,
                    autenticación y seguridad. No se pueden desactivar.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Base jurídica:</strong> Interés legítimo (art. 6.1.f RGPD)
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-foreground text-sm">Cookies Analíticas</h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Opcional</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web,
                    recopilando información anónima sobre páginas visitadas, tiempo de navegación
                    y origen del tráfico. Utilizamos Google Analytics y Vercel Analytics.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Base jurídica:</strong> Consentimiento (art. 6.1.a RGPD)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Proveedores:</strong> Google LLC, Vercel Inc.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sand-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sand-dark"></div>
                </label>
              </div>

              <div className="flex items-start justify-between p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-foreground text-sm">Cookies de Marketing</h4>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Opcional</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Utilizadas para mostrar publicidad relevante y medir la efectividad de campañas publicitarias.
                    Pueden incluir cookies de redes sociales y plataformas de publicidad.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Base jurídica:</strong> Consentimiento (art. 6.1.a RGPD)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Proveedores:</strong> Google Ads, Meta Platforms, Inc.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sand-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sand-dark"></div>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Puede cambiar estas preferencias en cualquier momento accediendo al enlace "Política de Cookies"
                  en el pie de página. Su consentimiento se renovará automáticamente cada 12 meses.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={acceptNecessary}>
                  Solo necesarias
                </Button>
                <Button size="sm" onClick={savePreferences}>
                  Guardar preferencias
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;