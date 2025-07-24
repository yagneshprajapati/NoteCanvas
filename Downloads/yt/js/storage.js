// Storage Manager - Handles IndexedDB operations
class StorageManager {
  constructor() {
    this.dbName = "NoteCanvasDB";
    this.dbVersion = 1;
    this.storeName = "notes";
    this.db = null;
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: "id",
          });
          objectStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async saveData(data) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const objectStore = transaction.objectStore(this.storeName);

      const dataToSave = {
        id: "canvas_data",
        data: data,
        timestamp: Date.now(),
      };

      const request = objectStore.put(dataToSave);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async loadData() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get("canvas_data");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
    });
  }

  async clearData() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Auto-save functionality
  setupAutoSave(callback, interval = 30000) {
    // Default 30 seconds
    setInterval(() => {
      callback();
    }, interval);
  }
}

// Export for use in other modules
window.StorageManager = StorageManager;
