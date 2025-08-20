import { supabase } from './supabase';
import { addContentToDB } from './indexedDB';
import db from './indexedDB';

/**
 * Background sync service for managing IndexedDB data
 */
class SyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.syncIntervalMs = 5 * 60 * 1000; // 5 minutes
    this.maxStaleTime = 24 * 60 * 60 * 1000; // 24 hours
    this.maxCacheSize = 10000; // Maximum number of items to keep in IndexedDB
  }

  /**
   * Start the background sync service
   */
  start() {
    if (this.isRunning) {
      console.log('Sync service already running');
      return;
    }

    console.log('Starting background sync service...');
    this.isRunning = true;
    this.lastSyncTime = Date.now();

    // Run initial sync
    this.performSync();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.syncIntervalMs);

    // Listen for page visibility changes to sync when user returns
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.shouldSync()) {
        this.performSync();
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Connection restored, performing sync...');
      this.performSync();
    });
  }

  /**
   * Stop the background sync service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping background sync service...');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Check if sync should run based on last sync time
   */
  shouldSync() {
    if (!this.lastSyncTime) return true;
    return (Date.now() - this.lastSyncTime) > this.syncIntervalMs;
  }

  /**
   * Perform a complete sync operation
   */
  async performSync() {
    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }

    try {
      console.log('Performing background sync...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping sync');
        return;
      }

      // Perform sync operations
      await Promise.allSettled([
        this.fetchNewData(user.id),
        // this.cleanStaleData(), // DISABLED: Prevents accidental data deletion
        this.optimizeDatabase()
      ]);

      this.lastSyncTime = Date.now();
      console.log('Background sync completed');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  /**
   * Fetch new data from Supabase and add to IndexedDB
   */
  async fetchNewData(userId) {
    try {
      // Get the latest item from IndexedDB to determine sync point
      const latestLocal = await db.content
        .where('user_id')
        .equals(userId)
        .reverse()
        .first();

      let lastSyncDate = new Date(0); // Default to epoch
      if (latestLocal) {
        lastSyncDate = new Date(latestLocal.date_added);
      }

      console.log('Fetching data newer than:', lastSyncDate.toISOString());

      // Fetch new data from Supabase
      const { data: newData, error } = await supabase
        .from('content')
        .select('*')
        .eq('user_id', userId)
        .gt('date_added', lastSyncDate.toISOString())
        .order('date_added', { ascending: false })
        .limit(1000); // Limit to prevent overwhelming

      if (error) {
        console.error('Error fetching new data:', error);
        return;
      }

      if (newData && newData.length > 0) {
        console.log(`Adding ${newData.length} new items to IndexedDB`);
        await addContentToDB(newData);
      } else {
        console.log('No new data to sync');
      }
    } catch (error) {
      console.error('Error in fetchNewData:', error);
    }
  }

  /**
   * Remove stale data from IndexedDB
   * NOTE: Currently disabled to prevent accidental data loss
   * User data should not be automatically deleted based on age
   */
  async cleanStaleData() {
    try {
      // DISABLED: Do not remove user data automatically
      // This was causing valid user data to be deleted
      console.log('Stale data cleanup is disabled to prevent data loss');
      return;
      
      // COMMENTED OUT THE DANGEROUS CODE:
      // const staleThreshold = new Date(Date.now() - this.maxStaleTime);
      // 
      // // Find stale items
      // const staleItems = await db.content
      //   .where('date_added')
      //   .below(staleThreshold.toISOString())
      //   .toArray();
      //
      // if (staleItems.length > 0) {
      //   console.log(`Removing ${staleItems.length} stale items from IndexedDB`);
      //   const staleIds = staleItems.map(item => item.id);
      //   await db.content.bulkDelete(staleIds);
      // }
    } catch (error) {
      console.error('Error cleaning stale data:', error);
    }
  }

  /**
   * Optimize database by limiting cache size
   * Made more conservative to prevent data loss
   */
  async optimizeDatabase() {
    try {
      const totalCount = await db.content.count();
      
      // Increase the limit significantly to reduce aggressive deletion
      const conservativeLimit = 50000; // Much higher limit
      
      if (totalCount > conservativeLimit) {
        console.log(`Cache size (${totalCount}) exceeds conservative limit (${conservativeLimit}), optimizing...`);
        
        // Only remove excess items, not all old ones
        const itemsToRemove = Math.min(totalCount - conservativeLimit, 1000); // Limit removal to 1000 items max
        const oldestItems = await db.content
          .orderBy('date_added')
          .limit(itemsToRemove)
          .toArray();

        if (oldestItems.length > 0) {
          const oldestIds = oldestItems.map(item => item.id);
          await db.content.bulkDelete(oldestIds);
          console.log(`Removed ${oldestItems.length} oldest items to optimize cache`);
        }
      } else {
        console.log(`Cache size (${totalCount}) is within conservative limits`);
      }
    } catch (error) {
      console.error('Error optimizing database:', error);
    }
  }

  /**
   * Force a manual sync
   */
  async forceSync() {
    if (!this.isRunning) {
      console.log('Sync service not running, starting for manual sync...');
      this.start();
    }
    await this.performSync();
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      nextSyncIn: this.lastSyncTime ? 
        Math.max(0, this.syncIntervalMs - (Date.now() - this.lastSyncTime)) : 0
    };
  }

  /**
   * Emergency data recovery - fetch all user data from Supabase
   * Use this when local data has been accidentally deleted
   */
  async recoverAllData() {
    try {
      console.log('Starting emergency data recovery...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user for data recovery');
        return false;
      }

      // Fetch ALL user data from Supabase
      const { data: allData, error } = await supabase
        .from('content')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching data for recovery:', error);
        return false;
      }

      if (allData && allData.length > 0) {
        // Clear existing data and restore from Supabase
        await db.content.clear();
        await db.content.bulkAdd(allData);
        console.log(`Successfully recovered ${allData.length} items from Supabase`);
        return true;
      } else {
        console.log('No data found in Supabase to recover');
        return false;
      }
    } catch (error) {
      console.error('Error in data recovery:', error);
      return false;
    }
  }

  /**
   * Clear all IndexedDB data (for testing/debugging)
   */
  async clearAllData() {
    try {
      await db.content.clear();
      console.log('All IndexedDB data cleared');
    } catch (error) {
      console.error('Error clearing IndexedDB data:', error);
    }
  }
}

// Create singleton instance
const syncService = new SyncService();

export default syncService;
