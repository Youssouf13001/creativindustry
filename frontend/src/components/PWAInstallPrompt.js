import { useState, useEffect } from "react";
import { Download, Bell, X, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState("default");

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed - ne plus afficher pendant 30 jours
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 jours en ms
      if (Date.now() - dismissedTime < thirtyDays) {
        return;
      }
    }

    // Check if user already clicked "Installer" before (even if cancelled)
    const alreadyPrompted = localStorage.getItem('pwa-install-prompted');
    if (alreadyPrompted) {
      return;
    }

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowInstallBanner(true), 5000); // Show after 5s
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Marquer qu'on a déjà proposé l'installation
    localStorage.setItem('pwa-install-prompted', 'true');

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      localStorage.setItem('pwa-installed', 'true');
    }
    setShowInstallBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    // Ne plus afficher pendant 30 jours
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Show test notification
        new Notification('CREATIVINDUSTRY', {
          body: 'Les notifications sont activées !',
          icon: '/icons/icon-192x192.png'
        });
      }
    }
  };

  if (isInstalled || !showInstallBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-card border border-primary/30 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <Smartphone className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-white">Installer l'application</h3>
                <p className="text-white/60 text-sm">Accès rapide depuis votre écran</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/40 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs">✓</span>
              Accès hors ligne
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs">✓</span>
              Notifications en temps réel
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs">✓</span>
              Chargement ultra rapide
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={18} />
                Installer
              </button>
              {notificationPermission !== 'granted' && (
                <button
                  onClick={requestNotificationPermission}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded transition-colors"
                  title="Activer les notifications"
                >
                  <Bell size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
