import { useState, useEffect, useRef } from 'react';
import { X, Camera, ScanLine } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';
import { useT } from '@/contexts/LanguageContext';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const t = useT();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against the camera emitting the same code many times per second.
  const handledRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const startingRef = useRef(false);

  useEffect(() => {
    if (open) {
      handledRef.current = false;
      lastScanRef.current = null;
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startScanner = async () => {
    if (startingRef.current || scannerRef.current) return;
    startingRef.current = true;
    try {
      setError(null);

      // Wait for the container to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!containerRef.current) return;

      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777,
        },
        (decodedText) => {
          const code = decodedText.trim();
          if (!code) return;
          // Only accept the first successful read per dialog session,
          // plus a 1.5s cooldown for the same code as a second guard.
          const now = Date.now();
          const last = lastScanRef.current;
          if (handledRef.current) return;
          if (last && last.code === code && now - last.at < 1500) return;
          handledRef.current = true;
          lastScanRef.current = { code, at: now };
          onScan(code);
          stopScanner();
          onOpenChange(false);
        },
        () => {
          // QR code scanning error (ignored - normal when no code in view)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'فشل في تشغيل الكاميرا');
      setIsScanning(false);
    } finally {
      startingRef.current = false;
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setIsScanning(false);
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch (err) {
      // Scanner may already be stopped; ignore.
    }
  };

  const handleClose = () => {
    stopScanner();
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            {t('sell.scanBarcode')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {/* Scanner Container */}
          <div 
            ref={containerRef}
            id="barcode-reader" 
            className="w-full bg-black min-h-[300px]"
          />

          {/* Scanning Animation Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-40 border-2 border-primary rounded-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="w-full h-1 text-primary animate-pulse" />
                </div>
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary" />
                <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-primary" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-primary" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary" />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center p-4 text-center">
              <Camera className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-destructive font-medium mb-2">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={startScanner}
                className="mt-4 pos-button-primary"
              >
                {t('common.previous')}
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">
            {t('sell.scanBarcode')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
