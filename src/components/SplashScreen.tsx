import logo from '@/assets/hani-logo.png';

interface SplashScreenProps {
  message?: string;
}

export function SplashScreen({ message }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-primary-foreground">
      <div className="flex flex-col items-center gap-6 animate-scale-in">
        <img
          src={logo}
          alt="كشك هاني"
          width={1024}
          height={1024}
          className="w-28 h-28 rounded-3xl shadow-2xl bg-card object-contain"
        />
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">كشك هاني</h1>
          <p className="text-sm text-primary-foreground/80">Hani Kiosk · نقاط البيع</p>
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-primary-foreground/20">
          <div className="h-full w-1/2 animate-[splash-bar_1.1s_ease-in-out_infinite] rounded-full bg-primary-foreground/80" />
        </div>
        {message && <p className="text-xs text-primary-foreground/70">{message}</p>}
      </div>
      <p className="absolute bottom-8 text-[11px] text-primary-foreground/60">
        🇹🇳 صنع في تونس
      </p>
    </div>
  );
}

export default SplashScreen;
