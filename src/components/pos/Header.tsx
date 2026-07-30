import { Store, Wifi, WifiOff, Bell, LogOut, Download, Monitor, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDisplayMode } from '@/hooks/useDisplayMode';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface HeaderProps {
  lowStockCount: number;
  kioskName?: string;
  kioskNameFr?: string;
  logo?: string | null;
  compact?: boolean;
}

export function Header({ lowStockCount, kioskName, kioskNameFr, logo, compact = false }: HeaderProps) {
  const { t, language } = useLanguage();
  const { signOut } = useAuth();
  const { isInstallable, install } = usePWAInstall();
  const { isDesktop, toggleMode } = useDisplayMode();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());

  const displayName = kioskName || t('header.appName');
  const displayNameSecondary = kioskNameFr || t('header.appNameSecondary');

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('auth.logoutSuccess'));
  };


  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'ar' ? 'ar-TN' : 'fr-TN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <header className={`bg-primary text-primary-foreground px-4 safe-top ${compact ? 'py-1.5' : 'py-3'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={displayName} className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} rounded-xl object-cover`} />
          ) : (
            <div className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} bg-primary-foreground/20 rounded-xl flex items-center justify-center`}>
              <Store className={compact ? 'w-4 h-4' : 'w-6 h-6'} />
            </div>
          )}
          <div className={compact ? 'flex items-baseline gap-2' : ''}>
            <h1 className={compact ? 'text-sm font-bold' : 'text-lg font-bold'}>{displayName}</h1>
            <p className="text-xs text-primary-foreground/80">{displayNameSecondary}</p>
          </div>
        </div>


        <div className="flex items-center gap-3">
          {isInstallable && (
            <button
              onClick={async () => {
                const accepted = await install();
                if (accepted) toast.success(t('common.success'));
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success/20 hover:bg-success/30 transition-colors animate-pulse"
              title={t('common.install')}
            >
              <Download className="w-3 h-3" />
              <span>{t('common.install')}</span>
            </button>
          )}

          <button
            onClick={toggleMode}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
            title={isDesktop ? (language === 'ar' ? 'وضع الجوال' : 'Mode mobile') : (language === 'ar' ? 'وضع المكتب' : 'Mode bureau')}
            aria-label={isDesktop ? 'Mobile mode' : 'Desktop mode'}
          >
            {isDesktop ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </button>

          <span className="text-sm font-medium">{formatTime(currentTime)}</span>
          {lowStockCount > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center font-bold">
                {lowStockCount}
              </span>
            </div>
          )}

          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-success/20' : 'bg-destructive/20'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>{t('common.online')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>{t('common.offline')}</span>
              </>
            )}
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
            title={t('auth.signOut')}
          >
            <LogOut className="w-3 h-3" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
