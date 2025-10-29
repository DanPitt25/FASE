// Analytics utilities that respect cookie consent

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
    dataLayer: any[];
  }
}

export const initializeAnalytics = (trackingId: string) => {
  // Only initialize if we have consent
  const consent = localStorage.getItem('fase-cookie-consent');
  if (!consent) return;

  try {
    const parsed = JSON.parse(consent);
    if (!parsed.preferences?.analytics) return;

    // Load Google Analytics
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}', {
        page_title: document.title,
        page_location: window.location.href,
      });
    `;
    document.head.appendChild(script2);
  } catch (error) {
    console.error('Error initializing analytics:', error);
  }
};

export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  const consent = localStorage.getItem('fase-cookie-consent');
  if (!consent) return;

  try {
    const parsed = JSON.parse(consent);
    if (!parsed.preferences?.analytics) return;

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, parameters);
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

export const trackPageView = (path: string) => {
  const consent = localStorage.getItem('fase-cookie-consent');
  if (!consent) return;

  try {
    const parsed = JSON.parse(consent);
    if (!parsed.preferences?.analytics) return;

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_TRACKING_ID, {
        page_path: path,
      });
    }
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

// Marketing/advertising utilities
export const initializeMarketingPixels = () => {
  const consent = localStorage.getItem('fase-cookie-consent');
  if (!consent) return;

  try {
    const parsed = JSON.parse(consent);
    if (!parsed.preferences?.marketing) return;

    // Initialize Facebook Pixel, LinkedIn Insight Tag, etc.
    console.log('Marketing pixels would be initialized here');
  } catch (error) {
    console.error('Error initializing marketing pixels:', error);
  }
};