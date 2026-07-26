import { useEffect } from 'react';

// Minimal, spec-typed Screen Wake Lock hook. Keeps the phone screen on while
// mounted. Gracefully no-ops on browsers/devices without the API.
interface WakeLockSentinel {
  release: () => Promise<void>;
  released: boolean;
  addEventListener: (event: 'release', cb: () => void) => void;
}
interface WakeLockNavigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
}

export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const nav = navigator as unknown as WakeLockNavigator;
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await nav.wakeLock!.request('screen');
        if (cancelled) {
          await s.release();
          return;
        }
        sentinel = s;
        s.addEventListener('release', () => {
          sentinel = null;
        });
      } catch {
        // ignore — user gesture may be required, or feature unavailable
      }
    };

    void acquire();

    // Re-acquire when the tab becomes visible again.
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && sentinel === null) {
        void acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) void sentinel.release();
    };
  }, [enabled]);
}
