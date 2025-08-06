import React, { useState, useEffect } from 'react';
import './Settings.css';

function Settings({ isOpen, onClose, onSignOut, isDarkTheme, onClearCache }) {
  const [cacheStats, setCacheStats] = useState({
    localStorage: 0,
    sessionStorage: 0,
    indexedDB: 0,
    total: 0
  });
  const [isClearing, setIsClearing] = useState(false);

  // Calculate cache sizes
  useEffect(() => {
    if (isOpen) {
      calculateCacheSize();
    }
  }, [isOpen]);

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
      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Clear localStorage (keep essential data)
      const layoutMode = localStorage.getItem('layoutMode');
      localStorage.clear();
      if (layoutMode) {
        localStorage.setItem('layoutMode', layoutMode);
      }

      // Clear sessionStorage
      sessionStorage.clear();

      // Call parent component's cache clear function
      if (onClearCache) {
        await onClearCache();
      }

      // Recalculate cache stats
      await calculateCacheSize();
      
      alert('Cache cleared successfully! Fresh data will be loaded.');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error clearing cache. Please try again.');
    } finally {
      setIsClearing(false);
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
              <div className="cache-stat total">
                <span>Total Storage:</span>
                <span>{formatBytes(cacheStats.total)}</span>
              </div>
            </div>
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
            <h3>Account</h3>
            <button onClick={onSignOut} className="logout-button">
              <img src="/assets/logout.png" alt="Sign Out" />
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
