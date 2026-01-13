import { Store, Wifi, WifiOff, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  lowStockCount: number;
}

export function Header({ lowStockCount }: HeaderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());

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
    return date.toLocaleTimeString('ar-TN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <header className="bg-primary text-primary-foreground px-4 py-3 safe-top">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">كشك هاني</h1>
            <p className="text-xs text-primary-foreground/80">Hani Kiosk</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
                <span>متصل</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>غير متصل</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
