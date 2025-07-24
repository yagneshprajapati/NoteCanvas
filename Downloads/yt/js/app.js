// Main Application Class - Orchestrates all components
class NoteCanvasApp {
  constructor() {
    this.storageManager = new StorageManager();
    this.encryptionManager = new EncryptionManager();
    this.canvasManager = null;
    this.notesManager = null;
    this.uiManager = null;
    this.pendingImportData = null;
    this.autoSaveInterval = null;
    this.settings = {
      gridSize: 50,
      autoSaveInterval: 30,
      showGrid: true,
      password: null,
    };

    this.init();
  }

  async init() {
    try {
      // Initialize storage
      await this.storageManager.initDB();

      // Initialize components
      this.canvasManager = new CanvasManager();
      this.notesManager = new NotesManager(this.canvasManager);
      this.uiManager = new UIManager(this);

      // Load settings
      await this.loadSettings();

      // Load existing notes
      await this.loadNotes();

      // Setup auto-save
      this.setupAutoSave();

      // Initialize UI enhancements
      this.uiManager.initTooltips();
      this.uiManager.initTouchGestures();

      // Listen for note modifications to trigger auto-save
      document.addEventListener("note-modified", () => {
        this.autoSave();
      });

      console.log("NoteCanvas app initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.uiManager?.showNotification("Failed to initialize app", "error");
    }
  }

  async loadNotes() {
    try {
      this.uiManager.showLoadingIndicator(true);

      const savedData = await this.storageManager.loadData();
      if (savedData) {
        if (savedData.encrypted) {
          // Data is encrypted, request password
          this.uiManager.showPasswordDialog(
            "Enter password to decrypt your notes"
          );
          this.pendingDecryptData = savedData.data;
        } else {
          // Data is not encrypted
          this.notesManager.loadNotes(savedData.notes || []);
          this.canvasManager.zoomLevel = savedData.canvas?.zoom || 1;
          this.canvasManager.panX = savedData.canvas?.panX || 0;
          this.canvasManager.panY = savedData.canvas?.panY || 0;
          this.canvasManager.updateTransform();
          this.canvasManager.updateZoomDisplay();
        }
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
      this.uiManager.showNotification("Failed to load notes", "error");
    } finally {
      this.uiManager.showLoadingIndicator(false);
    }
  }

  async saveNotes() {
    try {
      const data = {
        notes: this.notesManager.exportNotes(),
        canvas: {
          zoom: this.canvasManager.zoomLevel,
          panX: this.canvasManager.panX,
          panY: this.canvasManager.panY,
        },
        settings: this.settings,
        timestamp: Date.now(),
      };

      if (this.settings.password) {
        // Encrypt the data
        const encryptedData = this.encryptionManager.encrypt(
          data,
          this.settings.password
        );
        await this.storageManager.saveData({
          encrypted: true,
          data: encryptedData,
        });
      } else {
        // Save without encryption
        await this.storageManager.saveData({
          encrypted: false,
          ...data,
        });
      }

      console.log("Notes saved successfully");
    } catch (error) {
      console.error("Failed to save notes:", error);
      this.uiManager.showNotification("Failed to save notes", "error");
      throw error;
    }
  }

  async handlePasswordInput(password) {
    try {
      if (this.pendingDecryptData) {
        // Decrypt existing data
        const decryptedData = this.encryptionManager.decrypt(
          this.pendingDecryptData,
          password
        );
        this.notesManager.loadNotes(decryptedData.notes || []);

        if (decryptedData.canvas) {
          this.canvasManager.zoomLevel = decryptedData.canvas.zoom || 1;
          this.canvasManager.panX = decryptedData.canvas.panX || 0;
          this.canvasManager.panY = decryptedData.canvas.panY || 0;
          this.canvasManager.updateTransform();
          this.canvasManager.updateZoomDisplay();
        }

        if (decryptedData.settings) {
          this.settings = { ...this.settings, ...decryptedData.settings };
          this.applySettings();
        }

        this.settings.password = password; // Store for current session only
        this.pendingDecryptData = null;
        this.uiManager.showNotification(
          "Notes decrypted successfully",
          "success"
        );
      } else if (this.pendingImportData) {
        // Decrypt import data
        const decryptedData = this.encryptionManager.decrypt(
          this.pendingImportData,
          password
        );
        this.notesManager.loadNotes(decryptedData.notes || []);

        if (decryptedData.canvas) {
          this.canvasManager.zoomLevel = decryptedData.canvas.zoom || 1;
          this.canvasManager.panX = decryptedData.canvas.panX || 0;
          this.canvasManager.panY = decryptedData.canvas.panY || 0;
          this.canvasManager.updateTransform();
          this.canvasManager.updateZoomDisplay();
        }

        this.pendingImportData = null;
        this.uiManager.showNotification(
          "Notes imported successfully",
          "success"
        );

        // Auto-save the imported data
        await this.saveNotes();
      }
    } catch (error) {
      console.error("Decryption failed:", error);
      this.uiManager.showNotification(
        "Invalid password or corrupted data",
        "error"
      );
    }
  }

  async exportNotes(password) {
    try {
      const data = {
        notes: this.notesManager.exportNotes(),
        canvas: {
          zoom: this.canvasManager.zoomLevel,
          panX: this.canvasManager.panX,
          panY: this.canvasManager.panY,
        },
        settings: { ...this.settings, password: null }, // Don't export password
        timestamp: Date.now(),
        version: "1.0",
      };

      const encryptedData = this.encryptionManager.encrypt(data, password);

      // Create download
      const blob = new Blob([encryptedData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notecanvas-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.uiManager.showNotification("Notes exported successfully", "success");
    } catch (error) {
      console.error("Export failed:", error);
      this.uiManager.showNotification("Failed to export notes", "error");
    }
  }

  addTextNote() {
    const rect = document.getElementById("canvas").getBoundingClientRect();
    const screenX = rect.left + rect.width / 2 + Math.random() * 100 - 50;
    const screenY = rect.top + rect.height / 2 + Math.random() * 100 - 50;
    const canvasPos = this.canvasManager.screenToCanvas(screenX, screenY);

    this.notesManager.createTextNote(canvasPos.x - 150, canvasPos.y - 100);
    this.autoSave();
  }

  addImageNote() {
    document.getElementById("image-input").click();
  }

  setupAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.autoSave();
    }, this.settings.autoSaveInterval * 1000);
  }

  async autoSave() {
    try {
      await this.saveNotes();
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }

  async loadSettings() {
    try {
      const savedData = await this.storageManager.loadData();
      if (savedData && savedData.settings) {
        this.settings = { ...this.settings, ...savedData.settings };
        this.applySettings();
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  applySettings() {
    this.canvasManager.setGridSize(this.settings.gridSize);
    this.canvasManager.setGridVisibility(this.settings.showGrid);
    this.setupAutoSave();
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
    this.autoSave();
  }

  getSettings() {
    return { ...this.settings };
  }

  // Utility methods
  showStats() {
    const noteCount = this.notesManager.notes.size;
    const textNotes = Array.from(this.notesManager.notes.values()).filter(
      (n) => n.type === "text"
    ).length;
    const imageNotes = Array.from(this.notesManager.notes.values()).filter(
      (n) => n.type === "image"
    ).length;

    console.log(
      `Stats: ${noteCount} total notes (${textNotes} text, ${imageNotes} images)`
    );
    return { total: noteCount, text: textNotes, images: imageNotes };
  }

  fitNotesToView() {
    const notes = Array.from(this.notesManager.notes.values());
    this.canvasManager.fitToView(notes);
  }

  clearAllNotes() {
    if (
      confirm(
        "Are you sure you want to delete all notes? This action cannot be undone."
      )
    ) {
      this.notesManager.notes.clear();
      document.getElementById("canvas-content").innerHTML = "";
      this.autoSave();
      this.uiManager.showNotification("All notes cleared", "success");
    }
  }

  // Keyboard shortcuts help
  showKeyboardShortcuts() {
    const shortcuts = [
      "T - Add text note",
      "I - Add image note",
      "Ctrl+S - Save notes",
      "Ctrl+O - Import notes",
      "Ctrl+Shift+E - Export notes",
      "Ctrl+, - Settings",
      "Ctrl+D - Duplicate selected note(s)",
      "Ctrl+A - Select all notes",
      "Delete - Delete selected note(s)",
      "Escape - Deselect all",
      "Ctrl+Plus - Zoom in",
      "Ctrl+Minus - Zoom out",
      "Ctrl+0 - Reset zoom",
      "Arrow keys - Pan canvas / Move selected notes",
      "Shift+Arrow keys - Move selected notes faster",
      "",
      "Multi-selection:",
      "Ctrl+Click - Add/remove note from selection",
      "Drag on empty space - Selection box",
      "Shift+Drag - Add to existing selection",
    ];

    console.log("Keyboard Shortcuts:\n" + shortcuts.join("\n"));
    return shortcuts;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.noteCanvasApp = new NoteCanvasApp();

  // Make some methods globally accessible for debugging
  window.showStats = () => window.noteCanvasApp.showStats();
  window.fitToView = () => window.noteCanvasApp.fitNotesToView();
  window.clearAll = () => window.noteCanvasApp.clearAllNotes();
  window.showShortcuts = () => window.noteCanvasApp.showKeyboardShortcuts();
});

// Handle page visibility change for auto-save
document.addEventListener("visibilitychange", () => {
  if (document.hidden && window.noteCanvasApp) {
    window.noteCanvasApp.autoSave();
  }
});

// Handle before unload for final save
window.addEventListener("beforeunload", (e) => {
  if (window.noteCanvasApp) {
    window.noteCanvasApp.autoSave();
  }
});

// Service Worker registration for offline support (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) => console.log("Service Worker registration failed"));
  });
}
