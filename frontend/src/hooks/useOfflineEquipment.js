import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing offline state and caching equipment data
 */
export function useOfflineEquipment() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw-equipment.js')
        .then((registration) => {
          console.log('Equipment SW registered:', registration.scope);
          setIsServiceWorkerReady(true);
        })
        .catch((error) => {
          console.error('Equipment SW registration failed:', error);
        });
    }

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache deployment for offline use
  const cacheDeployment = useCallback((deploymentId, data) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_DEPLOYMENT',
        deploymentId,
        data
      });
    }
    
    // Also store in localStorage as backup
    try {
      const cachedDeployments = JSON.parse(localStorage.getItem('cached_deployments') || '{}');
      cachedDeployments[deploymentId] = {
        data,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem('cached_deployments', JSON.stringify(cachedDeployments));
    } catch (e) {
      console.error('Failed to cache deployment:', e);
    }
  }, []);

  // Get cached deployment
  const getCachedDeployment = useCallback((deploymentId) => {
    try {
      const cachedDeployments = JSON.parse(localStorage.getItem('cached_deployments') || '{}');
      return cachedDeployments[deploymentId]?.data || null;
    } catch (e) {
      return null;
    }
  }, []);

  // Store pending signature for later sync
  const storePendingSignature = useCallback((deploymentId, signatureData, signerName, type) => {
    try {
      const pendingSignatures = JSON.parse(localStorage.getItem('pending_signatures') || '[]');
      pendingSignatures.push({
        deploymentId,
        signatureData,
        signerName,
        type,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('pending_signatures', JSON.stringify(pendingSignatures));
      return true;
    } catch (e) {
      console.error('Failed to store pending signature:', e);
      return false;
    }
  }, []);

  // Get pending signatures
  const getPendingSignatures = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('pending_signatures') || '[]');
    } catch (e) {
      return [];
    }
  }, []);

  // Clear pending signature after successful sync
  const clearPendingSignature = useCallback((index) => {
    try {
      const pendingSignatures = JSON.parse(localStorage.getItem('pending_signatures') || '[]');
      pendingSignatures.splice(index, 1);
      localStorage.setItem('pending_signatures', JSON.stringify(pendingSignatures));
    } catch (e) {
      console.error('Failed to clear pending signature:', e);
    }
  }, []);

  return {
    isOnline,
    isServiceWorkerReady,
    cacheDeployment,
    getCachedDeployment,
    storePendingSignature,
    getPendingSignatures,
    clearPendingSignature
  };
}

/**
 * Offline status indicator component
 */
export function OfflineIndicator() {
  const { isOnline } = useOfflineEquipment();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
      Mode hors-ligne
    </div>
  );
}
