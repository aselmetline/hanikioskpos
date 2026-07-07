import { useState, useRef } from 'react';
import { Store, Printer, Percent, Phone, RotateCcw, Save, Upload, Trash2, Info, MapPin, Building2, Mail, Briefcase, FileText, AlertTriangle, Download, Languages } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { AppSettings } from '@/hooks/useSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onFactoryReset?: () => Promise<void>;
  onExportBackup?: (onProgress?: (progress: number, message: string) => void) => Promise<void>;
  onImportBackup?: (file: File, onProgress?: (progress: number, message: string) => void) => Promise<void>;
}

export function SettingsTab({ settings, onUpdateSettings, onResetSettings, onFactoryReset, onExportBackup, onImportBackup }: SettingsTabProps) {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [showFactoryReset, setShowFactoryReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupMessage, setBackupMessage] = useState('');

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        toast.error(t('settings.logoSizeError'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    handleChange('logo', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    toast.success(t('settings.settingsSaved'));
  };

  const handleReset = () => {
    onResetSettings();
    setLocalSettings(settings);
    toast.success(t('settings.settingsReset'));
  };

  const inputAlign = isRTL ? 'text-right' : 'text-left';

  return (
    <div className="p-4 pb-24 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="w-5 h-5 text-primary" />
            {t('settings.languageSettings')}
          </CardTitle>
          <CardDescription>{t('settings.languageSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>{t('settings.chooseLanguage')}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as 'ar' | 'fr')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">🇹🇳 {t('settings.arabic')}</SelectItem>
                <SelectItem value="fr">🇫🇷 {t('settings.french')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Store Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="w-5 h-5 text-primary" />
            {t('settings.storeInfo')}
          </CardTitle>
          <CardDescription>{t('settings.storeInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kioskName">{t('settings.nameAr')}</Label>
              <Input id="kioskName" value={localSettings.kioskName} onChange={(e) => handleChange('kioskName', e.target.value)} placeholder="كشك هاني" className="text-right" dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kioskNameFr">{t('settings.nameFr')}</Label>
              <Input id="kioskNameFr" value={localSettings.kioskNameFr} onChange={(e) => handleChange('kioskNameFr', e.target.value)} placeholder="Hani Kiosk" dir="ltr" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.logo')}</Label>
            <div className="flex items-center gap-4">
              {localSettings.logo ? (
                <div className="relative">
                  <img src={localSettings.logo} alt="logo" className="w-16 h-16 rounded-xl object-cover border-2 border-border" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -left-2 w-6 h-6" onClick={handleRemoveLogo}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Store className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="w-4 h-4" />
                  {t('settings.uploadLogo')}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG (max 500KB)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            {t('settings.storeDetails')}
          </CardTitle>
          <CardDescription>{t('settings.storeDetailsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessType">{t('settings.businessType')}</Label>
            <Select value={localSettings.businessType} onValueChange={(value) => handleChange('businessType', value)}>
              <SelectTrigger id="businessType">
                <SelectValue placeholder={t('settings.chooseBusinessType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kiosk">{t('businessTypes.kiosk')}</SelectItem>
                <SelectItem value="grocery">{t('businessTypes.grocery')}</SelectItem>
                <SelectItem value="restaurant">{t('businessTypes.restaurant')}</SelectItem>
                <SelectItem value="cafe">{t('businessTypes.cafe')}</SelectItem>
                <SelectItem value="bakery">{t('businessTypes.bakery')}</SelectItem>
                <SelectItem value="pharmacy">{t('businessTypes.pharmacy')}</SelectItem>
                <SelectItem value="clinic">{t('businessTypes.clinic')}</SelectItem>
                <SelectItem value="clothing">{t('businessTypes.clothing')}</SelectItem>
                <SelectItem value="electronics">{t('businessTypes.electronics')}</SelectItem>
                <SelectItem value="ecommerce">{t('businessTypes.ecommerce')}</SelectItem>
                <SelectItem value="other">{t('businessTypes.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {t('common.address')}
            </Label>
            <div className="grid grid-cols-1 gap-3">
              <Input value={localSettings.storeAddressCity} onChange={(e) => handleChange('storeAddressCity', e.target.value)} placeholder={t('settings.city')} className={inputAlign} />
              <Input value={localSettings.storeAddressArea} onChange={(e) => handleChange('storeAddressArea', e.target.value)} placeholder={t('settings.area')} className={inputAlign} />
              <Input value={localSettings.storeAddressStreet} onChange={(e) => handleChange('storeAddressStreet', e.target.value)} placeholder={t('settings.street')} className={inputAlign} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storePhone" className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {t('settings.storePhone')}
              </Label>
              <Input id="storePhone" value={localSettings.storePhone} onChange={(e) => handleChange('storePhone', e.target.value)} placeholder="+213 XX XXX XXXX" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeEmail" className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {t('settings.storeEmail')}
              </Label>
              <Input id="storeEmail" type="email" value={localSettings.storeEmail} onChange={(e) => handleChange('storeEmail', e.target.value)} placeholder="store@example.com" dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commercialRegister" className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {t('settings.commercialRegister')} (RC)
              </Label>
              <Input id="commercialRegister" value={localSettings.commercialRegister} onChange={(e) => handleChange('commercialRegister', e.target.value)} placeholder="RC B 12345" className={inputAlign} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matriculeFiscal" className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                المعرف الجبائي (MF)
              </Label>
              <Input id="matriculeFiscal" value={localSettings.matriculeFiscal} onChange={(e) => handleChange('matriculeFiscal', e.target.value)} placeholder="1234567/A/M/000" dir="ltr" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeNotes" className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              {t('settings.extraNotes')}
            </Label>
            <Textarea id="storeNotes" value={localSettings.storeNotes} onChange={(e) => handleChange('storeNotes', e.target.value)} placeholder={t('settings.extraNotes')} className={`${inputAlign} min-h-[80px]`} />
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Percent className="w-5 h-5 text-primary" />
            {t('settings.taxSettings')}
          </CardTitle>
          <CardDescription>{t('settings.taxSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settings.enableTax')}</Label>
              <p className="text-xs text-muted-foreground">{t('settings.applyTaxOnSales')}</p>
            </div>
            <Switch checked={localSettings.taxEnabled} onCheckedChange={(checked) => handleChange('taxEnabled', checked)} />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="taxRate">{t('settings.taxRate')}</Label>
            <div className="flex items-center gap-2">
              <Input id="taxRate" type="number" min="0" max="100" step="0.1" value={(localSettings.taxRate * 100).toFixed(1)} onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) / 100)} className="w-24 text-center" dir="ltr" disabled={!localSettings.taxEnabled} />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              {localSettings.taxEnabled ? t('settings.taxNotice') : t('settings.taxDisabled')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pointsPerDinar">{t('settings.pointsPerDinar')}</Label>
            <div className="flex items-center gap-2">
              <Input id="pointsPerDinar" type="number" min="0" max="10" step="1" value={localSettings.pointsPerDinar} onChange={(e) => handleChange('pointsPerDinar', parseInt(e.target.value) || 1)} className="w-24 text-center" dir="ltr" />
              <span className="text-muted-foreground">{t('settings.pointsUnit')}</span>
            </div>
          </div>

          <Separator />

          {/* Fiscal Stamp (Tunisia) */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>الطابع الجبائي (Timbre fiscal)</Label>
              <p className="text-xs text-muted-foreground">يضاف تلقائياً على الفواتير النقدية</p>
            </div>
            <Switch checked={localSettings.fiscalStampEnabled} onCheckedChange={(checked) => handleChange('fiscalStampEnabled', checked)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscalStampAmount">قيمة الطابع الجبائي (TND)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="fiscalStampAmount"
                type="number"
                min="0"
                step="0.001"
                value={localSettings.fiscalStampAmount}
                onChange={(e) => handleChange('fiscalStampAmount', parseFloat(e.target.value) || 0)}
                className="w-32 text-center"
                dir="ltr"
                disabled={!localSettings.fiscalStampEnabled}
              />
              <span className="text-muted-foreground">TND</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              القيمة الرسمية 1.000 TND حسب قانون المالية التونسي
            </p>
          </div>
        </CardContent>
      </Card>


      {/* Printer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5 text-primary" />
            {t('settings.printerSettings')}
          </CardTitle>
          <CardDescription>{t('settings.printerSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settings.enablePrinter')}</Label>
              <p className="text-xs text-muted-foreground">{t('settings.autoPrint')}</p>
            </div>
            <Switch checked={localSettings.printerEnabled} onCheckedChange={(checked) => handleChange('printerEnabled', checked)} />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="printerWidth">{t('settings.paperWidth')}</Label>
            <Select value={localSettings.printerWidth} onValueChange={(value: '58mm' | '80mm') => handleChange('printerWidth', value)} disabled={!localSettings.printerEnabled}>
              <SelectTrigger id="printerWidth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm ({t('settings.smallPaper')})</SelectItem>
                <SelectItem value="80mm">80mm ({t('settings.normalPaper')})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="printerIP">{t('settings.printerIP')}</Label>
            <Input id="printerIP" value={localSettings.printerIP} onChange={(e) => handleChange('printerIP', e.target.value)} placeholder="192.168.1.100" dir="ltr" disabled={!localSettings.printerEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="w-5 h-5 text-primary" />
            {t('settings.whatsappTitle')}
          </CardTitle>
          <CardDescription>{t('settings.whatsappDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">{t('common.phone')}</Label>
            <Input id="whatsappNumber" value={localSettings.whatsappNumber} onChange={(e) => handleChange('whatsappNumber', e.target.value)} placeholder="+21622123456" dir="ltr" />
          </div>
        </CardContent>
      </Card>

      {/* Inventory */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-primary" />
            {t('settings.inventorySettings')}
          </CardTitle>
          <CardDescription>{t('settings.inventorySettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">{t('settings.lowStockThreshold')}</Label>
            <div className="flex items-center gap-2">
              <Input id="lowStockThreshold" type="number" min="1" max="100" value={localSettings.lowStockThreshold} onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value) || 10)} className="w-24 text-center" dir="ltr" />
              <span className="text-muted-foreground">{t('common.items')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-primary" />
            {t('settings.backupTitle')}
          </CardTitle>
          <CardDescription>{t('settings.backupDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(exporting || importing) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{backupMessage}</span>
                <span className="font-medium">{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="h-2" />
            </div>
          )}
          {onExportBackup && (
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={exporting || importing}
              onClick={async () => {
                setExporting(true); setBackupProgress(0); setBackupMessage('');
                try {
                  await onExportBackup((p, m) => { setBackupProgress(p); setBackupMessage(m); });
                } finally { setExporting(false); setBackupProgress(0); setBackupMessage(''); }
              }}
            >
              <Download className="w-4 h-4" />
              {exporting ? t('common.loading') : t('settings.exportBackup')}
            </Button>
          )}
          {onImportBackup && (
            <>
              <input
                ref={backupFileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImporting(true); setBackupProgress(0); setBackupMessage('');
                  try {
                    await onImportBackup(file, (p, m) => { setBackupProgress(p); setBackupMessage(m); });
                  } finally {
                    setImporting(false); setBackupProgress(0); setBackupMessage('');
                    if (backupFileRef.current) backupFileRef.current.value = '';
                  }
                }}
              />
              <Button variant="outline" className="w-full gap-2" disabled={importing || exporting} onClick={() => backupFileRef.current?.click()}>
                <Upload className="w-4 h-4" />
                {importing ? t('common.loading') : t('settings.importBackup')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} className="flex-1 gap-2">
          <Save className="w-4 h-4" />
          {t('settings.saveSettings')}
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          {t('settings.resetSettings')}
        </Button>
      </div>

      {/* Factory Reset */}
      {onFactoryReset && (
        <>
          <Separator className="my-4" />
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                {t('settings.factoryReset')}
              </CardTitle>
              <CardDescription>{t('settings.factoryResetDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full gap-2" onClick={() => setShowFactoryReset(true)}>
                <AlertTriangle className="w-4 h-4" />
                {t('settings.factoryReset')}
              </Button>
            </CardContent>
          </Card>

          <AlertDialog open={showFactoryReset} onOpenChange={setShowFactoryReset}>
            <AlertDialogContent className="max-w-[90vw] sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
              <AlertDialogHeader>
                <AlertDialogTitle className={`flex items-center gap-2 text-destructive ${isRTL ? 'text-right' : 'text-left'}`}>
                  <AlertTriangle className="w-5 h-5" />
                  {t('settings.confirmFactoryReset')}
                </AlertDialogTitle>
                <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                  {t('settings.confirmFactoryResetDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="mt-0" disabled={resetting}>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={resetting}
                  onClick={async (e) => {
                    e.preventDefault();
                    setResetting(true);
                    try {
                      await onFactoryReset();
                      setShowFactoryReset(false);
                    } finally { setResetting(false); }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {resetting ? t('common.loading') : t('common.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
