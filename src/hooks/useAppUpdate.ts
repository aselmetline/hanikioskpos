import { useCallback, useEffect, useState } from 'react';

export type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'offline' | 'unsupported' | 'error';

function waitForInstalled(worker: ServiceWorker, timeout = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    if (worker.state === 'installed') return resolve(true);
    const timer = setTimeout(() => resolve(false), timeout);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') { clearTimeout(timer); resolve(true); }
      if (worker.state === 'redundant') { clearTimeout(timer); resolve(false); }
    });
  });
}

export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) { setStatus('unsupported'); return; }
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      setRegistration(reg);
      if (reg.waiting) setStatus('available');
    }).catch(() => {});
  }, []);

  const checkForUpdate = useCallback(async (): Promise<UpdateStatus> => {
    if (!navigator.onLine) { setStatus('offline'); return 'offline'; }
    if (!('serviceWorker' in navigator)) { setStatus('unsupported'); return 'unsupported'; }
    setStatus('checking');
    try {
      const reg = registration ?? (await navigator.serviceWorker.getRegistration()) ?? null;
      if (!reg) { setStatus('unsupported'); return 'unsupported'; }
      setRegistration(reg);
      if (reg.waiting) { setStatus('available'); return 'available'; }
      await reg.update();
      const incoming = reg.installing || reg.waiting;
      if (incoming && (await waitForInstalled(incoming)) && reg.waiting) {
        setStatus('available'); return 'available';
      }
      setStatus('up-to-date'); return 'up-to-date';
    } catch {
      const s: UpdateStatus = navigator.onLine ? 'error' : 'offline';
      setStatus(s); return s;
    }
  }, [registration]);

  const applyUpdate = useCallback(() => {
    const waiting = registration?.waiting;
    let reloaded = false;
    const reload = () => { if (!reloaded) { reloaded = true; window.location.reload(); } };
    if (waiting) {
      navigator.serviceWorker.addEventListener('controllerchange', reload);
      waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(reload, 3000);
    } else {
      reload();
    }
  }, [registration]);

  return { status, checkForUpdate, applyUpdate };
}
