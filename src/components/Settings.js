import React, { useState, useEffect } from 'react';
import './Settings.css';
import db from '../lib/indexedDB';
import { useSyncService } from '../hooks/useSyncService';
import { 
  cleanupImageCache, 
  clearFailedImageCache, 
  getCacheStats, 
  performFullCacheCleanup 
} from '../lib/cacheUtils';

function Settings({ isOpen, onClose, onSignOut, isDarkTheme, onClearCache }) {
  const [cacheStats, setCacheStats] = useState({
    localStorage: 0,
    sessionStorage: 0,
    indexedDB: 0,
    serverCache: 0,
    browserImageCache: 0,
    failedImageUrls: 0,
    total: 0
  });
  const [isClearing, setIsClearing] = useState(false);
  const [advancedCacheStats, setAdvancedCacheStats] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Add sync service hook
  const { syncStatus, forceSync, recoverData } = useSyncService();

  // Calculate cache sizes
  useEffect(() => {
    if (isOpen) {
      calculateCacheSize();
      calculateServerCacheSize().then(serverCacheSize => {
        setCacheStats(prevStats => ({
          ...prevStats,
          serverCache: serverCacheSize,
          total: prevStats.total + serverCacheSize,
        }));
      });
      // Get advanced cache statistics
      updateAdvancedCacheStats();
    }
  }, [isOpen]);

  const updateAdvancedCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setAdvancedCacheStats(stats);
      setCacheStats(prevStats => ({
        ...prevStats,
        browserImageCache: stats.totalSize,
        failedImageUrls: stats.failedUrls
      }));
    } catch (error) {
      console.error('Error getting advanced cache stats:', error);
    }
  };

  const calculateCacheSize = async () => {
    try {
      // Calculate localStorage size
      let localStorageSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }

      // Calculate sessionStorage size
      let sessionStorageSize = 0;
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          sessionStorageSize += sessionStorage[key].length + key.length;
        }
      }

      // Estimate browser cache (approximation)
      let indexedDBSize = 0;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        indexedDBSize = estimate.usage || 0;
      }

      const total = localStorageSize + sessionStorageSize + indexedDBSize;

      setCacheStats({
        localStorage: localStorageSize,
        sessionStorage: sessionStorageSize,
        indexedDB: indexedDBSize,
        total: total
      });
    } catch (error) {
      console.error('Error calculating cache size:', error);
    }
  };

  const calculateServerCacheSize = async () => {
    try {
      const response = await fetch('http://localhost:8000/instagram/api/get-server-cache-size/', {
        method: 'GET',
      });
      const data = await response.json();
      return data.cache_size;
    } catch (error) {
      console.error('Error fetching server cache size:', error);
      return 0;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Perform comprehensive cache cleanup
      const cleanupResults = await performFullCacheCleanup();
      console.log('Cache cleanup results:', cleanupResults);

      // Clear localStorage (keep essential data)
      const layoutMode = localStorage.getItem('layoutMode');
      localStorage.clear();
      if (layoutMode) {
        localStorage.setItem('layoutMode', layoutMode);
      }

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear server-side cache
      const response = await fetch('http://localhost:8000/instagram/api/clear-server-cache/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear server-side cache.');
      }

      // Call parent component's cache clear function
      if (onClearCache) {
        await onClearCache();
      }

      // Recalculate cache stats
      await calculateCacheSize();
      await updateAdvancedCacheStats();
      
      const message = cleanupResults.browserCacheRemoved > 0 || cleanupResults.failedCacheCleared > 0 
        ? `Cache cleared successfully! Removed ${cleanupResults.browserCacheRemoved} invalid images and ${cleanupResults.failedCacheCleared} failed URLs.`
        : 'Cache cleared successfully! Fresh data will be loaded.';
      
      alert(message);
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error clearing cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear all caches on logout
      await handleClearCache();

      // Clear IndexedDB
      await db.delete();

      // Call parent component's sign-out function
      if (onSignOut) {
        await onSignOut();
      }
    } catch (error) {
      console.error('Error during sign-out:', error);
    }
  };

  const handleDataRecovery = async () => {
    setIsRecovering(true);
    try {
      console.log('Starting data recovery...');
      const success = await recoverData();
      
      if (success) {
        alert('Data recovery successful! Your content has been restored from the server.');
        // Refresh the page to reload the recovered data
        window.location.reload();
      } else {
        alert('Data recovery failed. Please check the console for errors.');
      }
    } catch (error) {
      console.error('Error during data recovery:', error);
      alert('Data recovery failed: ' + error.message);
    } finally {
      setIsRecovering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-content" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-body">
          <div className="settings-section">
            <h3>Cache & Storage</h3>
            <div className="cache-info">
              <div className="cache-stat">
                <span>App Data:</span>
                <span>{formatBytes(cacheStats.localStorage)}</span>
              </div>
              <div className="cache-stat">
                <span>Session Data:</span>
                <span>{formatBytes(cacheStats.sessionStorage)}</span>
              </div>
              <div className="cache-stat">
                <span>Browser Cache:</span>
                <span>{formatBytes(cacheStats.indexedDB)}</span>
              </div>
              <div className="cache-stat">
                <span>Image Cache:</span>
                <span>{formatBytes(cacheStats.browserImageCache || 0)}</span>
              </div>
              <div className="cache-stat">
                <span>Server Cache:</span>
                <span>{formatBytes(cacheStats.serverCache || 0)}</span>
              </div>
              {cacheStats.failedImageUrls > 0 && (
                <div className="cache-stat warning">
                  <span>Failed Images:</span>
                  <span>{cacheStats.failedImageUrls} URLs</span>
                </div>
              )}
              <div className="cache-stat total">
                <span>Total Storage:</span>
                <span>{formatBytes(cacheStats.total)}</span>
              </div>
            </div>
            {advancedCacheStats && (
              <div className="advanced-cache-info">
                <details>
                  <summary>Advanced Cache Details</summary>
                  <div className="cache-detail">
                    <span>Valid Images:</span>
                    <span>{advancedCacheStats.validEntries}</span>
                  </div>
                  <div className="cache-detail">
                    <span>Invalid Images:</span>
                    <span>{advancedCacheStats.invalidEntries}</span>
                  </div>
                  <div className="cache-detail">
                    <span>Total Entries:</span>
                    <span>{advancedCacheStats.totalEntries}</span>
                  </div>
                </details>
              </div>
            )}
            <button 
              onClick={handleClearCache} 
              className="clear-cache-button"
              disabled={isClearing}
            >
              {isClearing ? 'Clearing...' : 'Clear Cache & Refresh Data'}
            </button>
            <p className="cache-description">
              Cached data includes: images, search results, user preferences, and temporary files. 
              Clearing cache will refresh all your content while preserving your layout settings.
            </p>
          </div>

          <div className="settings-section">
            <h3>Data Sync</h3>
            <div className="sync-info">
              <div className="sync-stat">
                <span>Status:</span>
                <span className={`sync-status ${syncStatus.isRunning ? 'running' : 'stopped'}`}>
                  {syncStatus.isRunning ? '🟢 Running' : '🔴 Stopped'}
                </span>
              </div>
              {syncStatus.lastSyncTime && (
                <div className="sync-stat">
                  <span>Last Sync:</span>
                  <span>{new Date(syncStatus.lastSyncTime).toLocaleString()}</span>
                </div>
              )}
              {syncStatus.nextSyncIn > 0 && (
                <div className="sync-stat">
                  <span>Next Sync:</span>
                  <span>{Math.round(syncStatus.nextSyncIn / 1000 / 60)} min</span>
                </div>
              )}
            </div>
            <button 
              onClick={forceSync} 
              className="sync-button"
            >
              🔄 Sync Now
            </button>
            <button 
              onClick={handleDataRecovery} 
              className="sync-button"
              disabled={isRecovering}
              style={{ backgroundColor: '#ff6b35', marginTop: '8px' }}
            >
              {isRecovering ? '🔄 Recovering...' : '🚑 Emergency Data Recovery'}
            </button>
            <p className="sync-description">
              Automatically syncs new data from server and cleans up old cached data. 
              Runs every 5 minutes when the app is active.
              <br />
              <strong>Emergency Recovery:</strong> Use if your data was accidentally deleted. This will restore all your content from the server.
            </p>
          </div>

          <div className="settings-section">
            <h3>Account</h3>
            <button onClick={handleSignOut} className="logout-button">
              <img src="./assets/logout.png" alt="Sign Out" />
              Sign Out
            </button>
          </div>
          
          <div className="settings-section">
            <h3>About</h3>
            <p>SuperMind - Your personal knowledge assistant</p>
            <p>Version 2.0.1</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
