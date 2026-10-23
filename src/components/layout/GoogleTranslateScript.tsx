'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: new (
          options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
          elementId: string
        ) => void;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

export function GoogleTranslateScript() {
  useEffect(() => {
    // 1. Guard for server-side execution
    if (typeof window === 'undefined') return;

    // Check RTL state on mount
    const cookieMatch = document.cookie.match(/(^|;\s*)googtrans=\/en\/([a-z]{2})/i);
    const activeLang = cookieMatch?.[2]?.toLowerCase() || localStorage.getItem('site_language');
    if (activeLang === 'ur') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ur';
      document.body.classList.add('rtl-layout');
    }

    // 2. Define the Google Translate initialization callback for top 10 Indian languages
    window.googleTranslateElementInit = () => {
      try {
        if (window.google?.translate?.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: 'en,hi,bn,mr,te,ta,gu,ur,kn,or',
              autoDisplay: false,
            },
            'google_translate_element'
          );
        }
      } catch (err) {
        console.error('Google Translate init error:', err);
      }
    };

    // 3. Inject Google Translate script if not already in document
    const existingScript = document.getElementById('google-translate-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.type = 'text/javascript';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement) {
      // Script was already loaded, call init directly
      window.googleTranslateElementInit();
    }

    // 4. Observer to counteract Google's forced `top: 40px` banner displacement
    const cleanBodyTop = () => {
      if (document.body.style.top && document.body.style.top !== '0px') {
        document.body.style.top = '0px';
      }
      if (document.body.style.position === 'relative') {
        document.body.style.position = 'static';
      }
    };

    const observer = new MutationObserver(() => {
      cleanBodyTop();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Run clean up initially
    cleanBodyTop();

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      id="google_translate_element"
      style={{
        position: 'fixed',
        top: -9999,
        left: -9999,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  );
}
