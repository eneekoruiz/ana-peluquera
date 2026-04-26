/// <reference types="vite/client" />

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    va: (...args: any[]) => void;
    updateCookieConsent: (preferences: {
      necessary: boolean;
      analytics: boolean;
      marketing: boolean;
    }) => void;
  }
}
