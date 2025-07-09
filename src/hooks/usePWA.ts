import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  canInstall: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

export const usePWA = () => {
  const [pwaState, setPWAState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    canInstall: false,
    installPrompt: null
  });

  useEffect(() => {
    // Check if app is already installed
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setPWAState(prev => ({ ...prev, isInstalled }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] Install prompt available');
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      
      setPWAState(prev => ({
        ...prev,
        isInstallable: true,
        canInstall: true,
        installPrompt: installEvent
      }));
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setPWAState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null
      }));
    };

    // Listen for online/offline status
    const handleOnline = () => {
      console.log('[PWA] App is online');
      setPWAState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      console.log('[PWA] App is offline');
      setPWAState(prev => ({ ...prev, isOffline: true }));
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered:', registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        console.log('[PWA] Service Worker update found');
      });

      // Handle successful registration
      if (registration.installing) {
        console.log('[PWA] Service Worker installing');
      } else if (registration.waiting) {
        console.log('[PWA] Service Worker waiting');
      } else if (registration.active) {
        console.log('[PWA] Service Worker active');
      }

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  };

  const installApp = async (): Promise<boolean> => {
    if (!pwaState.installPrompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      await pwaState.installPrompt.prompt();
      const choiceResult = await pwaState.installPrompt.userChoice;
      
      console.log('[PWA] User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        setPWAState(prev => ({
          ...prev,
          canInstall: false,
          installPrompt: null
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      return false;
    }
  };

  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        registration.update();
      }
    }
  };

  return {
    ...pwaState,
    installApp,
    checkForUpdates
  };
};