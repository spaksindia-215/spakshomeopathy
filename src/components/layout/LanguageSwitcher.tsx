'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import i18n, {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE_INFO,
  changeAppLanguage,
  getInitialLanguage,
  type SupportedLocale,
  type LanguageInfo,
} from '@/lib/i18n';

export function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<SupportedLocale>('en');
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync current language with i18next on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initial = getInitialLanguage();
    setCurrentLang(initial);

    const onLangChanged = (lng: string) => {
      setCurrentLang((lng as SupportedLocale) || 'en');
    };

    i18n.on('languageChanged', onLangChanged);
    return () => {
      i18n.off('languageChanged', onLangChanged);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchFilter('');
    }
  }, [isOpen]);

  const activeLanguageInfo: LanguageInfo = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ??
      DEFAULT_LANGUAGE_INFO
    );
  }, [currentLang]);

  const filteredLanguages = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  const handleSelectLanguage = (targetLang: SupportedLocale) => {
    setIsOpen(false);
    if (targetLang === currentLang) return;
    setCurrentLang(targetLang);
    changeAppLanguage(targetLang);
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
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select Language"
        style={{
          height: 38,
          padding: '0 12px',
          borderRadius: 999,
          border: isOpen ? '1px solid #0a6a4b' : '1px solid rgba(15, 68, 105, 0.16)',
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

        <span>{activeLanguageInfo.nativeName}</span>

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
            width: 240,
            maxHeight: 380,
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid rgba(15, 68, 105, 0.12)',
            boxShadow: '0 16px 36px -4px rgba(15, 68, 105, 0.2), 0 4px 12px rgba(0, 0, 0, 0.06)',
            padding: '8px 6px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Quick Search */}
          <div style={{ padding: '4px 6px 8px 6px', borderBottom: '1px solid #f0f4f7' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#f6fbff',
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #e1ecf4',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search languages..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 12.5,
                  width: '100%',
                  color: '#0f4469',
                }}
              />
            </div>
          </div>

          {/* Languages Scrollable List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: 280,
              paddingTop: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {filteredLanguages.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 13, color: '#718096' }}>
                No language found
              </div>
            ) : (
              filteredLanguages.map((lang: LanguageInfo) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectLanguage(lang.code)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: isSelected ? '#e6f5ef' : 'transparent',
                      color: isSelected ? '#0a6a4b' : '#0f4469',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s ease',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f6fbff';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{lang.flag}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13.5, fontWeight: isSelected ? 700 : 500, lineHeight: 1.2 }}>
                          {lang.nativeName}
                        </span>
                        <span style={{ fontSize: 11, color: isSelected ? '#0a6a4b' : '#718096' }}>
                          {lang.name}
                          {lang.direction === 'rtl' ? ' (RTL)' : ''}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0a6a4b"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
