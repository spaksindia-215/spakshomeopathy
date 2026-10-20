'use client';

import { useState, useEffect, useRef } from 'react';

export function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check current language on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cookieMatch = document.cookie.match(/(^|;\s*)googtrans=\/en\/([a-z]{2})/i);
    const cookieLang = cookieMatch?.[2]?.toLowerCase() ?? null;
    const storedLang = localStorage.getItem('site_language');

    if (cookieLang === 'hi' || storedLang === 'hi') {
      setCurrentLang('hi');
    } else {
      setCurrentLang('en');
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLanguage = (targetLang: 'en' | 'hi') => {
    setIsOpen(false);

    if (targetLang === currentLang) return;

    setCurrentLang(targetLang);

    if (typeof window === 'undefined') return;

    localStorage.setItem('site_language', targetLang);

    const hostname = window.location.hostname;

    if (targetLang === 'hi') {
      // 1. Set Google Translate cookie to Hindi
      document.cookie = 'googtrans=/en/hi; path=/;';
      if (hostname && hostname !== 'localhost') {
        document.cookie = `googtrans=/en/hi; path=/; domain=${hostname};`;
        document.cookie = `googtrans=/en/hi; path=/; domain=.${hostname};`;
      }

      // 2. Trigger combo if available
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (select) {
        select.value = 'hi';
        select.dispatchEvent(new Event('change'));
      }

      // Reload to ensure full, pristine translation of the DOM
      window.location.reload();
    } else {
      // 1. Reset Google Translate cookie to English / clear it
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

      // Reload to restore original English HTML cleanly
      window.location.reload();
    }
  };

  return (
    <div
      ref={containerRef}
      className="notranslate"
      style={{
        position: 'relative',
        display: 'inline-block',
        fontFamily: 'inherit',
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select Language"
        style={{
          height: 38,
          padding: '0 12px',
          borderRadius: 999,
          border: '1px solid rgba(15, 68, 105, 0.16)',
          background: '#ffffff',
          color: '#0f4469',
          fontSize: 13.5,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(10, 106, 75, 0.15)' : 'none',
        }}
      >
        {/* Globe Icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: '#0a6a4b', flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>

        <span>{currentLang === 'hi' ? 'हिंदी' : 'English'}</span>

        {/* Chevron Icon */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
            color: '#455360',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 160,
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid rgba(15, 68, 105, 0.12)',
            boxShadow: '0 12px 28px -4px rgba(15, 68, 105, 0.18), 0 4px 10px rgba(0, 0, 0, 0.04)',
            padding: 6,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* English Option */}
          <button
            type="button"
            role="option"
            aria-selected={currentLang === 'en'}
            onClick={() => switchLanguage('en')}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: 'none',
              background: currentLang === 'en' ? '#e6f5ef' : 'transparent',
              color: currentLang === 'en' ? '#0a6a4b' : '#0f4469',
              fontWeight: currentLang === 'en' ? 700 : 500,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (currentLang !== 'en') e.currentTarget.style.background = '#f6fbff';
            }}
            onMouseLeave={(e) => {
              if (currentLang !== 'en') e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>🇬🇧</span>
              <span>English</span>
            </span>
            {currentLang === 'en' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a6a4b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {/* Hindi Option */}
          <button
            type="button"
            role="option"
            aria-selected={currentLang === 'hi'}
            onClick={() => switchLanguage('hi')}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: 'none',
              background: currentLang === 'hi' ? '#e6f5ef' : 'transparent',
              color: currentLang === 'hi' ? '#0a6a4b' : '#0f4469',
              fontWeight: currentLang === 'hi' ? 700 : 500,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (currentLang !== 'hi') e.currentTarget.style.background = '#f6fbff';
            }}
            onMouseLeave={(e) => {
              if (currentLang !== 'hi') e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>🇮🇳</span>
              <span>हिंदी (Hindi)</span>
            </span>
            {currentLang === 'hi' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a6a4b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
