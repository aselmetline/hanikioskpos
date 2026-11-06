import { useState } from 'react';
import { RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppUpdate } from '@/hooks/useAppUpdate';

declare const __APP_BUILD_DATE__: string;

const TXT = {
  ar: {
    title: 'معلومات التطبيق والتحديث', desc: 'تحقق من وجود إصدار جديد وطبّقه',
    version: 'الإصدار', updated: 'محدّث', available: 'يتوفر تحديث جديد',
    check: 'التحقق من التحديثات', update: 'تحديث التطبيق', checking: 'جارٍ التحقق...',
    latest: 'أنت تستخدم أحدث إصدار بالفعل',
    offline: 'تعذر التحقق، يرجى التأكد من الاتصال بالإنترنت',
    unsupported: 'التحديث التلقائي غير متاح هنا (يعمل في التطبيق المنشور فقط)',
    error: 'حدث خطأ أثناء التحقق من التحديثات',
    found: 'يتوفر إصدار جديد',
    confirmTitle: 'تحديث التطبيق الآن؟',
    confirmDesc: 'سيُعاد تحميل التطبيق. تأكد من إتمام أي عملية بيع جارية أو تعليق السلة المفتوحة قبل المتابعة.',
    cancel: 'إلغاء', confirm: 'تحديث الآن',
  },
  fr: {
    title: "Infos et mise à jour de l'application", desc: 'Vérifier et installer une nouvelle version',
    version: 'Version', updated: 'À jour', available: 'Mise à jour disponible',
    check: 'Vérifier les mises à jour', update: "Mettre à jour l'application", checking: 'Vérification...',
    latest: 'Vous utilisez déjà la dernière version',
    offline: 'Vérification impossible, vérifiez votre connexion Internet',
    unsupported: "Mise à jour automatique indisponible ici (application publiée uniquement)",
    error: 'Erreur lors de la vérification des mises à jour',
    found: 'Une nouvelle version est disponible',
    confirmTitle: "Mettre à jour maintenant ?",
    confirmDesc: "L'application va se recharger. Terminez toute vente en cours ou mettez le panier en attente avant de continuer.",
    cancel: 'Annuler', confirm: 'Mettre à jour',
  },
};

export function AppUpdateCard() {
  const { language } = useLanguage();
  const tx = TXT[language === 'fr' ? 'fr' : 'ar'];
  const { status, checkForUpdate, applyUpdate } = useAppUpdate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const buildDate = typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : '';
  const dateLabel = buildDate
    ? new Date(buildDate).toLocaleString(language === 'fr' ? 'fr-FR' : 'ar-TN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  const handleClick = async () => {
    if (status === 'available') { setConfirmOpen(true); return; }
    const r = await checkForUpdate();
    if (r === 'available') { toast.info(tx.found); setConfirmOpen(true); }
    else if (r === 'up-to-date') toast.success(tx.latest);
    else if (r === 'offline') toast.error(tx.offline);
    else if (r === 'unsupported') toast.warning(tx.unsupported);
    else if (r === 'error') toast.error(tx.error);
  };

  const checking = status === 'checking';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="w-5 h-5 text-primary" />
          {tx.title}
        </CardTitle>
        <CardDescription>{tx.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{tx.version}</span>
          <span className="font-medium" dir="ltr">{dateLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={status === 'available' ? 'destructive' : 'secondary'}>
            {status === 'available' ? tx.available : tx.updated}
          </Badge>
        </div>
        <Button className="w-full gap-2" onClick={handleClick} disabled={checking}>
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? tx.checking : status === 'available' ? tx.update : tx.check}
        </Button>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{tx.confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={applyUpdate}>{tx.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
