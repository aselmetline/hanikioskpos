import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AppSettings {
  kioskName: string;
  kioskNameFr: string;
  logo: string | null;
  taxRate: number;
  taxEnabled: boolean;
  currency: string;
  printerWidth: '58mm' | '80mm';
  printerEnabled: boolean;
  printerIP: string;
  pointsPerDinar: number;
  lowStockThreshold: number;
  whatsappNumber: string;
  storeAddressCity: string;
  storeAddressStreet: string;
  storeAddressArea: string;
  commercialRegister: string;
  storePhone: string;
  storeEmail: string;
  businessType: string;
  storeNotes: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  kioskName: 'كشك هاني',
  kioskNameFr: 'Hani Kiosk',
  logo: null,
  taxRate: 0.19,
  taxEnabled: true,
  currency: 'TND',
  printerWidth: '58mm',
  printerEnabled: false,
  printerIP: '',
  pointsPerDinar: 1,
  lowStockThreshold: 10,
  whatsappNumber: '+21622123456',
  storeAddressCity: '',
  storeAddressStreet: '',
  storeAddressArea: '',
  commercialRegister: '',
  storePhone: '',
  storeEmail: '',
  businessType: 'kiosk',
  storeNotes: '',
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Fetch settings from Supabase
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
      } else if (data) {
      setSettings({
          kioskName: data.kiosk_name || DEFAULT_SETTINGS.kioskName,
          kioskNameFr: data.kiosk_name_fr || DEFAULT_SETTINGS.kioskNameFr,
          logo: data.logo_url || null,
          taxRate: data.tax_rate ? Number(data.tax_rate) : DEFAULT_SETTINGS.taxRate,
          taxEnabled: (data as any).tax_enabled ?? DEFAULT_SETTINGS.taxEnabled,
          currency: data.currency || DEFAULT_SETTINGS.currency,
          printerWidth: (data.printer_width as '58mm' | '80mm') || DEFAULT_SETTINGS.printerWidth,
          printerEnabled: data.printer_enabled ?? DEFAULT_SETTINGS.printerEnabled,
          printerIP: data.printer_ip || DEFAULT_SETTINGS.printerIP,
          pointsPerDinar: data.points_per_dinar ?? DEFAULT_SETTINGS.pointsPerDinar,
          lowStockThreshold: data.low_stock_threshold ?? DEFAULT_SETTINGS.lowStockThreshold,
          whatsappNumber: data.whatsapp_number || DEFAULT_SETTINGS.whatsappNumber,
          storeAddressCity: (data as any).store_address_city || '',
          storeAddressStreet: (data as any).store_address_street || '',
          storeAddressArea: (data as any).store_address_area || '',
          commercialRegister: (data as any).commercial_register || '',
          storePhone: (data as any).store_phone || '',
          storeEmail: (data as any).store_email || '',
          businessType: (data as any).business_type || 'kiosk',
          storeNotes: (data as any).store_notes || '',
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (!user) return;

    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.kioskName !== undefined) dbUpdates.kiosk_name = updates.kioskName;
    if (updates.kioskNameFr !== undefined) dbUpdates.kiosk_name_fr = updates.kioskNameFr;
    if (updates.logo !== undefined) dbUpdates.logo_url = updates.logo;
    if (updates.taxRate !== undefined) dbUpdates.tax_rate = updates.taxRate;
    if (updates.taxEnabled !== undefined) dbUpdates.tax_enabled = updates.taxEnabled;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.printerWidth !== undefined) dbUpdates.printer_width = updates.printerWidth;
    if (updates.printerEnabled !== undefined) dbUpdates.printer_enabled = updates.printerEnabled;
    if (updates.printerIP !== undefined) dbUpdates.printer_ip = updates.printerIP;
    if (updates.pointsPerDinar !== undefined) dbUpdates.points_per_dinar = updates.pointsPerDinar;
    if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowStockThreshold;
    if (updates.whatsappNumber !== undefined) dbUpdates.whatsapp_number = updates.whatsappNumber;
    if (updates.storeAddressCity !== undefined) dbUpdates.store_address_city = updates.storeAddressCity;
    if (updates.storeAddressStreet !== undefined) dbUpdates.store_address_street = updates.storeAddressStreet;
    if (updates.storeAddressArea !== undefined) dbUpdates.store_address_area = updates.storeAddressArea;
    if (updates.commercialRegister !== undefined) dbUpdates.commercial_register = updates.commercialRegister;
    if (updates.storePhone !== undefined) dbUpdates.store_phone = updates.storePhone;
    if (updates.storeEmail !== undefined) dbUpdates.store_email = updates.storeEmail;
    if (updates.businessType !== undefined) dbUpdates.business_type = updates.businessType;
    if (updates.storeNotes !== undefined) dbUpdates.store_notes = updates.storeNotes;

    const { error } = await supabase
      .from('user_settings')
      .update(dbUpdates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating settings:', error);
      toast.error('خطأ في تحديث الإعدادات');
      return;
    }

    setSettings(prev => ({ ...prev, ...updates }));
    toast.success('تم تحديث الإعدادات');
  }, [user]);

  const resetSettings = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('user_settings')
      .update({
        kiosk_name: DEFAULT_SETTINGS.kioskName,
        kiosk_name_fr: DEFAULT_SETTINGS.kioskNameFr,
        logo_url: null,
        tax_rate: DEFAULT_SETTINGS.taxRate,
        tax_enabled: DEFAULT_SETTINGS.taxEnabled,
        currency: DEFAULT_SETTINGS.currency,
        printer_width: DEFAULT_SETTINGS.printerWidth,
        printer_enabled: DEFAULT_SETTINGS.printerEnabled,
        printer_ip: DEFAULT_SETTINGS.printerIP,
        points_per_dinar: DEFAULT_SETTINGS.pointsPerDinar,
        low_stock_threshold: DEFAULT_SETTINGS.lowStockThreshold,
        whatsapp_number: DEFAULT_SETTINGS.whatsappNumber,
        store_address_city: null,
        store_address_street: null,
        store_address_area: null,
        commercial_register: null,
        store_phone: null,
        store_email: null,
        business_type: 'kiosk',
        store_notes: null,
      } as any)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error resetting settings:', error);
      toast.error('خطأ في استعادة الإعدادات');
      return;
    }

    setSettings(DEFAULT_SETTINGS);
    toast.success('تم استعادة الإعدادات الافتراضية');
  }, [user]);

  return {
    settings,
    updateSettings,
    resetSettings,
    loading
  };
}
