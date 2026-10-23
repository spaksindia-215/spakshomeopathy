'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export type SupportedLocale =
  | 'en' // English
  | 'hi' // Hindi (हिंदी)
  | 'bn' // Bengali (বাংলা)
  | 'mr' // Marathi (मराठी)
  | 'te' // Telugu (తెలుగు)
  | 'ta' // Tamil (தமிழ்)
  | 'gu' // Gujarati (ગુજરાતી)
  | 'ur' // Urdu (اردو - RTL)
  | 'kn' // Kannada (ಕನ್ನಡ)
  | 'or'; // Odia (ଓଡ଼ିଆ)

export interface LanguageInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', direction: 'ltr', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', direction: 'ltr', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', direction: 'ltr', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', direction: 'ltr', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', direction: 'ltr', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', direction: 'ltr', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', direction: 'ltr', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', direction: 'ltr', flag: '🇮🇳' },
];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const DEFAULT_LANGUAGE_INFO: LanguageInfo = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  direction: 'ltr',
  flag: '🇬🇧',
};

export function isRtlLocale(locale: string): boolean {
  return locale === 'ur';
}

export function getInitialLanguage(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const cookieMatch = document.cookie.match(/(^|;\s*)googtrans=\/en\/([a-z]{2})/i);
  const cookieLang = cookieMatch?.[2]?.toLowerCase() as SupportedLocale | undefined;
  const storedLang = localStorage.getItem('site_language') as SupportedLocale | undefined;

  const candidate = cookieLang || storedLang;
  if (candidate && SUPPORTED_LANGUAGES.some((l) => l.code === candidate)) {
    return candidate;
  }
  return DEFAULT_LOCALE;
}

// Initialize i18next without static dictionary requirements
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: typeof window !== 'undefined' ? getInitialLanguage() : DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: {
      escapeValue: false,
    },
    // No static dictionaries required: translations happen dynamically
    resources: {},
    react: {
      useSuspense: false,
    },
  });
}

/**
 * Changes active language dynamically across i18next and the dynamic DOM translator.
 */
export function changeAppLanguage(targetLang: SupportedLocale) {
  if (typeof window === 'undefined') return;

  // 1. Update i18next
  i18n.changeLanguage(targetLang);

  // 2. Persist to localStorage
  localStorage.setItem('site_language', targetLang);

  // 3. Update document attributes
  const isRtl = isRtlLocale(targetLang);
  document.documentElement.lang = targetLang;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

  if (isRtl) {
    document.body.classList.add('rtl-layout');
  } else {
    document.body.classList.remove('rtl-layout');
  }

  const hostname = window.location.hostname;

  if (targetLang === 'en') {
    // Reset translation to original English
    document.cookie = 'googtrans=/en/en; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    if (hostname && hostname !== 'localhost') {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
    }

    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (select) {
      select.value = 'en';
      select.dispatchEvent(new Event('change'));
    }
  } else {
    // Set dynamic translation cookie for target Indian language
    const cookieVal = `/en/${targetLang}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    if (hostname && hostname !== 'localhost') {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${hostname};`;
      document.cookie = `googtrans=${cookieVal}; path=/; domain=.${hostname};`;
    }

    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (select) {
      select.value = targetLang;
      select.dispatchEvent(new Event('change'));
    }
  }

  // Reload to let dynamic translator translate pristine DOM
  window.location.reload();
}

export default i18n;
