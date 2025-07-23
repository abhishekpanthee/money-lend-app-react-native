import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageItem {
  key: string;
  value: any;
  timestamp: number;
  synced: boolean;
}

class LocalStorageManager {
  private syncQueue: StorageItem[] = [];
  private isOnline = true;

  constructor() {
    this.initializeNetworkListener();
    this.loadSyncQueue();
  }

  private initializeNetworkListener() {
    // Listen for network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processSyncQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      
      this.isOnline = navigator.onLine;
    }
  }

  private async loadSyncQueue() {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  async setItem(key: string, value: any, requiresSync = false): Promise<void> {
    try {
      const item: StorageItem = {
        key,
        value,
        timestamp: Date.now(),
        synced: !requiresSync || this.isOnline,
      };

      // Store locally
      await AsyncStorage.setItem(key, JSON.stringify(item));

      // Add to sync queue if offline and requires sync
      if (requiresSync && !this.isOnline) {
        this.syncQueue.push(item);
        await this.saveSyncQueue();
      }
    } catch (error) {
      console.error('Error setting item:', error);
    }
  }

  async getItem(key: string): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const item: StorageItem = JSON.parse(data);
        return item.value;
      }
      return null;
    } catch (error) {
      console.error('Error getting item:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      // Remove from sync queue if exists
      this.syncQueue = this.syncQueue.filter(item => item.key !== key);
      await this.saveSyncQueue();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      this.syncQueue = [];
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  private async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const itemsToSync = [...this.syncQueue];
    this.syncQueue = [];
    await this.saveSyncQueue();

    for (const item of itemsToSync) {
      try {
        // Here you would sync with your backend
        // For now, we'll just mark as synced
        await this.setItem(item.key, item.value, false);
        console.log(`Synced item: ${item.key}`);
      } catch (error) {
        console.error(`Error syncing item ${item.key}:`, error);
        // Re-add to queue if sync fails
        this.syncQueue.push(item);
      }
    }

    if (this.syncQueue.length > 0) {
      await this.saveSyncQueue();
    }
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  isConnected(): boolean {
    return this.isOnline;
  }
}

export const localStorage = new LocalStorageManager();