import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { translations, Language } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    return stored === 'fr' || stored === 'ar' ? stored : 'ar';
  });

  const dir: 'rtl' | 'ltr' = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  useEffect(() => {
    const html = document.documentElement;
    html.lang = language;
    html.dir = dir;
    document.body.style.direction = dir;
    document.body.style.textAlign = isRTL ? 'right' : 'left';
  }, [language, dir, isRTL]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (path: string): string => {
      const node = getNested(translations, path);
      if (node && typeof node === 'object' && (node.ar || node.fr)) {
        return node[language] || node.ar || path;
      }
      return path;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

// Convenience hook
export function useT() {
  return useLanguage().t;
}
