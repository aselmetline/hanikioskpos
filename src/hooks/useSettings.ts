import { useState, useEffect } from 'react';

export interface AppSettings {
  kioskName: string;
  kioskNameFr: string;
  logo: string | null;
  taxRate: number;
  currency: string;
  printerWidth: '58mm' | '80mm';
  printerEnabled: boolean;
  printerIP: string;
  pointsPerDinar: number;
  lowStockThreshold: number;
  whatsappNumber: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  kioskName: 'كشك هاني',
  kioskNameFr: 'Hani Kiosk',
  logo: null,
  taxRate: 0.19,
  currency: 'TND',
  printerWidth: '58mm',
  printerEnabled: false,
  printerIP: '',
  pointsPerDinar: 1,
  lowStockThreshold: 10,
  whatsappNumber: '+21622123456',
};

const STORAGE_KEY = 'hani-kiosk-settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
