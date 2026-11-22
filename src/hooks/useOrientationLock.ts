import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';

export function useOrientationLock() {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth && window.innerWidth < 760;
  });

  useEffect(() => {
    const applyNativeLock = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await ScreenOrientation.lock({ orientation: 'landscape' });
          await StatusBar.hide();
        } catch {
          // Ignore on unsupported devices
        }
      }
    };
    applyNativeLock();

    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 760);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const requestLandscape = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await ScreenOrientation.lock({ orientation: 'landscape' });
        await StatusBar.hide();
      } else {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
        const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void> };
        if (orient?.lock) {
          await orient.lock('landscape').catch(() => {});
        }
      }
    } catch {
      // Browser may require user gesture or device rotation
    }
  };

  return { isPortrait, requestLandscape };
}
