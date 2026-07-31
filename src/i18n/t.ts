// Global (non-React) translation helper for use inside hooks/utilities
// Reads the current language from localStorage so it stays in sync with LanguageContext.
import { translations, Language } from '@/i18n/translations';

const STORAGE_KEY = 'app_language';

export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return 'ar';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'fr' || stored === 'ar' ? stored : 'ar';
}

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

/** Translate a dotted key outside of React components. */
export function tx(path: string): string {
  const lang = getCurrentLanguage();
  const node = getNested(translations, path);
  if (node && typeof node === 'object' && (node.ar || node.fr)) {
    return node[lang] || node.ar || path;
  }
  return path;
}
