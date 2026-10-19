import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with instant auto-update and cache renewal
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Aviator Mobile App: Applying new version...');
    // Automatically apply update and reload immediately
    updateSW(true);
  },
  onOfflineReady() {
    console.log('Aviator Mobile App: Ready for offline operation');
  },
});

// Periodic update check every 30 seconds when app is active on phone
if (typeof window !== 'undefined') {
  setInterval(() => {
    try {
      updateSW(false);
    } catch {}
  }, 30 * 1000);

  // Check update when phone screen turns on or user returns to the app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      try {
        updateSW(false);
      } catch {}
    }
  });

  (window as any).__updateApp = () => {
    try {
      updateSW(true);
    } catch {}
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
    }
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
