import { useState, useRef } from 'react';
import { Store, Printer, Percent, Phone, RotateCcw, Save, Upload, Trash2, Info, MapPin, Building2, Mail, Briefcase, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { AppSettings } from '@/hooks/useSettings';
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
}

export function SettingsTab({ settings, onUpdateSettings, onResetSettings, onFactoryReset }: SettingsTabProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFactoryReset, setShowFactoryReset] = useState(false);
  const [resetting, setResetting] = useState(false);

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

      {/* Store Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            بيانات المتجر
          </CardTitle>
          <CardDescription>معلومات تفصيلية عن المتجر تظهر في الفواتير والتقارير</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessType">نوع النشاط</Label>
            <Select
              value={localSettings.businessType}
              onValueChange={(value) => handleChange('businessType', value)}
            >
              <SelectTrigger id="businessType">
                <SelectValue placeholder="اختر نوع النشاط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kiosk">🏪 كشك</SelectItem>
                <SelectItem value="grocery">🛒 بقالة</SelectItem>
                <SelectItem value="restaurant">🍽️ مطعم</SelectItem>
                <SelectItem value="cafe">☕ مقهى</SelectItem>
                <SelectItem value="bakery">🥖 مخبزة</SelectItem>
                <SelectItem value="pharmacy">💊 صيدلية</SelectItem>
                <SelectItem value="clinic">🏥 عيادة</SelectItem>
                <SelectItem value="clothing">👕 ملابس</SelectItem>
                <SelectItem value="electronics">📱 إلكترونيات</SelectItem>
                <SelectItem value="ecommerce">🌐 متجر إلكتروني</SelectItem>
                <SelectItem value="other">📋 أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              العنوان
            </Label>
            <div className="grid grid-cols-1 gap-3">
              <Input
                value={localSettings.storeAddressCity}
                onChange={(e) => handleChange('storeAddressCity', e.target.value)}
                placeholder="المدينة"
                className="text-right"
              />
              <Input
                value={localSettings.storeAddressArea}
                onChange={(e) => handleChange('storeAddressArea', e.target.value)}
                placeholder="المنطقة / الحي"
                className="text-right"
              />
              <Input
                value={localSettings.storeAddressStreet}
                onChange={(e) => handleChange('storeAddressStreet', e.target.value)}
                placeholder="الشارع / العنوان التفصيلي"
                className="text-right"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storePhone" className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                هاتف المتجر
              </Label>
              <Input
                id="storePhone"
                value={localSettings.storePhone}
                onChange={(e) => handleChange('storePhone', e.target.value)}
                placeholder="+213 XX XXX XXXX"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeEmail" className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                البريد الإلكتروني
              </Label>
              <Input
                id="storeEmail"
                type="email"
                value={localSettings.storeEmail}
                onChange={(e) => handleChange('storeEmail', e.target.value)}
                placeholder="store@example.com"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commercialRegister" className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              رقم التسجيل التجاري
            </Label>
            <Input
              id="commercialRegister"
              value={localSettings.commercialRegister}
              onChange={(e) => handleChange('commercialRegister', e.target.value)}
              placeholder="رقم السجل التجاري"
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeNotes" className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              ملاحظات إضافية
            </Label>
            <Textarea
              id="storeNotes"
              value={localSettings.storeNotes}
              onChange={(e) => handleChange('storeNotes', e.target.value)}
              placeholder="أي معلومات إضافية عن المتجر..."
              className="text-right min-h-[80px]"
            />
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
