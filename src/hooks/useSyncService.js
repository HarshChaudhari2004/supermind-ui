import { useEffect, useState } from 'react';
import syncService from '../lib/syncService';

/**
 * Custom hook for managing background sync
 */
export function useSyncService() {
  const [syncStatus, setSyncStatus] = useState({
    isRunning: false,
    lastSyncTime: null,
    nextSyncIn: 0
  });

  useEffect(() => {
    // Start sync service when component mounts
    syncService.start();

    // Set up status polling
    const statusInterval = setInterval(() => {
      setSyncStatus(syncService.getStatus());
    }, 1000); // Update every second

    // Cleanup on unmount
    return () => {
      clearInterval(statusInterval);
      // Note: We don't stop the sync service here as it should continue
      // running even if the component unmounts
    };
  }, []);

  const forceSync = async () => {
    await syncService.forceSync();
    setSyncStatus(syncService.getStatus());
  };

  const clearCache = async () => {
    await syncService.clearAllData();
    setSyncStatus(syncService.getStatus());
  };

  const recoverData = async () => {
    const success = await syncService.recoverAllData();
    setSyncStatus(syncService.getStatus());
    return success;
  };

  return {
    syncStatus,
    forceSync,
    clearCache,
    recoverData,
    startSync: () => syncService.start(),
    stopSync: () => syncService.stop()
  };
}
