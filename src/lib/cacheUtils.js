/**
 * Cache validation and cleanup utilities
 * Provides functions to validate and clean up browser caches and failed image tracking
 */

// Failed image cache - shared across components
export const failedImageCache = new Set();

// Global image state cache - persists loaded images across component re-renders
// This prevents images from being re-requested when components are re-created
export const imageStateCache = new Map();

/**
 * Gets the cached image state for a URL
 * @param {string} url - The image URL
 * @returns {object|null} - Cached state or null if not found
 */
export const getCachedImageState = (url) => {
  return imageStateCache.get(url) || null;
};

/**
 * Sets the cached image state for a URL
 * @param {string} url - The image URL
 * @param {object} state - The image state to cache
 */
export const setCachedImageState = (url, state) => {
  imageStateCache.set(url, {
    ...state,
    timestamp: Date.now()
  });
  
  // Clean up old entries (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [key, value] of imageStateCache.entries()) {
    if (value.timestamp < oneHourAgo) {
      imageStateCache.delete(key);
    }
  }
};

/**
 * Validates if a cached image response is still valid
 * @param {Response} cachedResponse - The cached response to validate
 * @returns {boolean} - True if the cache entry is valid
 */
export const isValidCachedImage = async (cachedResponse) => {
  try {
    if (!cachedResponse || !cachedResponse.ok) {
      return false;
    }

    const blob = await cachedResponse.blob();
    return blob.type.startsWith('image/') && blob.size > 0;
  } catch (error) {
    console.warn('Error validating cached image:', error);
    return false;
  }
};

/**
 * Cleans up invalid entries from the browser's image cache
 * @param {string} cacheName - Name of the cache to clean up (default: 'image-cache')
 * @returns {Promise<number>} - Number of entries removed
 */
export const cleanupImageCache = async (cacheName = 'image-cache') => {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    let removedCount = 0;

    for (const request of keys) {
      try {
        const response = await cache.match(request);
        const isValid = await isValidCachedImage(response);
        
        if (!isValid) {
          await cache.delete(request);
          removedCount++;
          console.log(`Removed invalid cache entry: ${request.url}`);
        }
      } catch (error) {
        console.warn(`Error checking cache entry ${request.url}:`, error);
        // Remove problematic entries
        await cache.delete(request);
        removedCount++;
      }
    }

    console.log(`Cache cleanup completed. Removed ${removedCount} invalid entries.`);
    return removedCount;
  } catch (error) {
    console.error('Error cleaning up image cache:', error);
    return 0;
  }
};

/**
 * Clears the failed image cache (URLs that have permanently failed)
 * @returns {number} - Number of entries cleared
 */
export const clearFailedImageCache = () => {
  const count = failedImageCache.size;
  failedImageCache.clear();
  console.log(`Cleared ${count} failed image entries.`);
  return count;
};

/**
 * Gets statistics about the current cache state
 * @param {string} cacheName - Name of the cache to analyze (default: 'image-cache')
 * @returns {Promise<object>} - Cache statistics
 */
export const getCacheStats = async (cacheName = 'image-cache') => {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    let totalSize = 0;
    let validEntries = 0;
    let invalidEntries = 0;

    for (const request of keys) {
      try {
        const response = await cache.match(request);
        const isValid = await isValidCachedImage(response);
        
        if (isValid) {
          validEntries++;
          const blob = await response.blob();
          totalSize += blob.size;
        } else {
          invalidEntries++;
        }
      } catch (error) {
        invalidEntries++;
      }
    }

    return {
      totalEntries: keys.length,
      validEntries,
      invalidEntries,
      totalSize,
      failedUrls: failedImageCache.size,
      cacheName
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalEntries: 0,
      validEntries: 0,
      invalidEntries: 0,
      totalSize: 0,
      failedUrls: failedImageCache.size,
      cacheName
    };
  }
};

/**
 * Performs a comprehensive cache cleanup including browser cache and failed URL tracking
 * @returns {Promise<object>} - Cleanup results
 */
export const performFullCacheCleanup = async () => {
  try {
    console.log('Starting comprehensive cache cleanup...');
    
    const browserCacheRemoved = await cleanupImageCache();
    const failedCacheCleared = clearFailedImageCache();
    const statsAfter = await getCacheStats();

    const results = {
      browserCacheRemoved,
      failedCacheCleared,
      remaining: statsAfter
    };

    console.log('Cache cleanup completed:', results);
    return results;
  } catch (error) {
    console.error('Error performing full cache cleanup:', error);
    return {
      browserCacheRemoved: 0,
      failedCacheCleared: 0,
      error: error.message
    };
  }
};
