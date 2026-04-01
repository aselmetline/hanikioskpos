import { useState, useRef } from 'react';
import { Store, Printer, Percent, Phone, RotateCcw, Save, Upload, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AppSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onResetSettings: () => void;
}

export function SettingsTab({ settings, onUpdateSettings, onResetSettings }: SettingsTabProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        toast.error('حجم الصورة كبير جداً (الحد الأقصى 500KB)');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  const handleReset = () => {
    onResetSettings();
    setLocalSettings(settings);
    toast.success('تم إعادة الإعدادات للقيم الافتراضية');
  };

  return (
    <div className="p-4 pb-24 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
      {/* Store Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="w-5 h-5 text-primary" />
            معلومات المتجر
          </CardTitle>
          <CardDescription>تخصيص اسم وشعار الكشك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kioskName">الاسم بالعربية</Label>
              <Input
                id="kioskName"
                value={localSettings.kioskName}
                onChange={(e) => handleChange('kioskName', e.target.value)}
                placeholder="كشك هاني"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kioskNameFr">الاسم بالفرنسية</Label>
              <Input
                id="kioskNameFr"
                value={localSettings.kioskNameFr}
                onChange={(e) => handleChange('kioskNameFr', e.target.value)}
                placeholder="Hani Kiosk"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الشعار</Label>
            <div className="flex items-center gap-4">
              {localSettings.logo ? (
                <div className="relative">
                  <img 
                    src={localSettings.logo} 
                    alt="شعار الكشك" 
                    className="w-16 h-16 rounded-xl object-cover border-2 border-border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -left-2 w-6 h-6"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Store className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  رفع شعار
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG (حد أقصى 500KB)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Percent className="w-5 h-5 text-primary" />
            إعدادات الضريبة
          </CardTitle>
          <CardDescription>تحديد نسبة ضريبة TVA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تفعيل الضريبة (TVA)</Label>
              <p className="text-xs text-muted-foreground">تطبيق الضريبة على المبيعات</p>
            </div>
            <Switch
              checked={localSettings.taxEnabled}
              onCheckedChange={(checked) => handleChange('taxEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="taxRate">نسبة الضريبة (TVA)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={(localSettings.taxRate * 100).toFixed(1)}
                onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) / 100)}
                className="w-24 text-center"
                dir="ltr"
                disabled={!localSettings.taxEnabled}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              {localSettings.taxEnabled ? 'الضريبة الافتراضية في تونس 19%' : 'الضريبة معطلة - لن يتم احتسابها'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pointsPerDinar">نقاط لكل دينار</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pointsPerDinar"
                type="number"
                min="0"
                max="10"
                step="1"
                value={localSettings.pointsPerDinar}
                onChange={(e) => handleChange('pointsPerDinar', parseInt(e.target.value) || 1)}
                className="w-24 text-center"
                dir="ltr"
              />
              <span className="text-muted-foreground">نقطة / TND</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printer Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5 text-primary" />
            إعدادات الطابعة
          </CardTitle>
          <CardDescription>تهيئة طابعة الفواتير الحرارية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تفعيل الطابعة</Label>
              <p className="text-xs text-muted-foreground">طباعة الفواتير تلقائياً</p>
            </div>
            <Switch
              checked={localSettings.printerEnabled}
              onCheckedChange={(checked) => handleChange('printerEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="printerWidth">عرض الورق</Label>
            <Select
              value={localSettings.printerWidth}
              onValueChange={(value: '58mm' | '80mm') => handleChange('printerWidth', value)}
              disabled={!localSettings.printerEnabled}
            >
              <SelectTrigger id="printerWidth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm (صغير)</SelectItem>
                <SelectItem value="80mm">80mm (عادي)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="printerIP">عنوان IP الطابعة</Label>
            <Input
              id="printerIP"
              value={localSettings.printerIP}
              onChange={(e) => handleChange('printerIP', e.target.value)}
              placeholder="192.168.1.100"
              dir="ltr"
              disabled={!localSettings.printerEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="w-5 h-5 text-primary" />
            رقم واتساب
          </CardTitle>
          <CardDescription>للتوصيل ومشاركة التقارير</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">رقم الهاتف</Label>
            <Input
              id="whatsappNumber"
              value={localSettings.whatsappNumber}
              onChange={(e) => handleChange('whatsappNumber', e.target.value)}
              placeholder="+21622123456"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-primary" />
            إعدادات المخزون
          </CardTitle>
          <CardDescription>تنبيهات نفاد المخزون</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">حد التنبيه الافتراضي</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lowStockThreshold"
                type="number"
                min="1"
                max="100"
                value={localSettings.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value) || 10)}
                className="w-24 text-center"
                dir="ltr"
              />
              <span className="text-muted-foreground">قطعة</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} className="flex-1 gap-2">
          <Save className="w-4 h-4" />
          حفظ الإعدادات
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          إعادة تعيين
        </Button>
      </div>
    </div>
  );
}
