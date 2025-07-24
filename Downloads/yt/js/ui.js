// UI Manager - Handles user interface interactions and modals
class UIManager {
  constructor(app) {
    this.app = app;
    this.initEventListeners();
  }

  initEventListeners() {
    // Toolbar buttons
    document.getElementById("add-text").addEventListener("click", () => {
      this.app.addTextNote();
    });

    document.getElementById("add-image").addEventListener("click", () => {
      this.app.addImageNote();
    });

    document.getElementById("save-btn").addEventListener("click", () => {
      this.app.saveNotes();
    });

    document.getElementById("import-btn").addEventListener("click", () => {
      this.showImportDialog();
    });

    document.getElementById("export-btn").addEventListener("click", () => {
      this.showExportDialog();
    });

    document.getElementById("settings-btn").addEventListener("click", () => {
      this.showSettingsDialog();
    });

    // Modal event listeners
    this.initModalEventListeners();

    // File input
    document.getElementById("file-input").addEventListener("change", (e) => {
      this.handleFileImport(e);
    });

    document.getElementById("image-input").addEventListener("change", (e) => {
      this.handleImageUpload(e);
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      this.handleGlobalKeyDown(e);
    });

    // Click outside to hide context menu
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#context-menu")) {
        this.app.notesManager.hideContextMenu();
      }
    });
  }

  initModalEventListeners() {
    // Password Modal
    const passwordModal = document.getElementById("password-modal");
    const passwordInput = document.getElementById("password-input");
    const passwordConfirm = document.getElementById("password-confirm");
    const passwordCancel = document.getElementById("password-cancel");

    passwordConfirm.addEventListener("click", () => {
      const password = passwordInput.value;
      if (password && password.length >= 1) {
        // Allow any password for decryption
        this.hideModal("password-modal");
        this.app.handlePasswordInput(password);
        passwordInput.value = "";
      } else {
        this.showNotification("Please enter a password", "error");
      }
    });

    passwordCancel.addEventListener("click", () => {
      this.hideModal("password-modal");
      passwordInput.value = "";
    });

    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        passwordConfirm.click();
      } else if (e.key === "Escape") {
        passwordCancel.click();
      }
    });

    // Export Modal
    const exportModal = document.getElementById("export-modal");
    const exportPassword = document.getElementById("export-password");
    const exportConfirm = document.getElementById("export-confirm");
    const exportCancel = document.getElementById("export-cancel");

    exportConfirm.addEventListener("click", () => {
      const password = exportPassword.value;
      if (password && password.length >= 6) {
        this.hideModal("export-modal");
        this.app.exportNotes(password);
        exportPassword.value = "";
      } else {
        this.showNotification(
          "Password must be at least 6 characters long",
          "error"
        );
      }
    });

    exportCancel.addEventListener("click", () => {
      this.hideModal("export-modal");
      exportPassword.value = "";
    });

    exportPassword.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        exportConfirm.click();
      } else if (e.key === "Escape") {
        exportCancel.click();
      }
    });

    // Settings Modal
    const settingsModal = document.getElementById("settings-modal");
    const settingsSave = document.getElementById("settings-save");
    const settingsCancel = document.getElementById("settings-cancel");

    settingsSave.addEventListener("click", () => {
      this.saveSettings();
      this.hideModal("settings-modal");
    });

    settingsCancel.addEventListener("click", () => {
      this.hideModal("settings-modal");
      this.loadSettings(); // Restore previous settings
    });

    // Settings controls
    document.getElementById("grid-size").addEventListener("input", (e) => {
      this.app.canvasManager.setGridSize(parseInt(e.target.value));
    });

    document.getElementById("show-grid").addEventListener("change", (e) => {
      this.app.canvasManager.setGridVisibility(e.target.checked);
    });
  }

  handleGlobalKeyDown(e) {
    // Global shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "s":
          e.preventDefault();
          this.app.saveNotes();
          this.showNotification("Notes saved!", "success");
          break;
        case "o":
          e.preventDefault();
          this.showImportDialog();
          break;
        case "e":
          if (e.shiftKey) {
            e.preventDefault();
            this.showExportDialog();
          }
          break;
        case ",":
          e.preventDefault();
          this.showSettingsDialog();
          break;
      }
    }

    // Quick add shortcuts (only when not typing in inputs)
    if (!e.target.matches("input, textarea, [contenteditable]")) {
      switch (e.key) {
        case "t":
        case "T":
          this.app.addTextNote();
          break;
        case "i":
        case "I":
          this.app.addImageNote();
          break;
      }
    }
  }

  showImportDialog() {
    document.getElementById("file-input").click();
  }

  showExportDialog() {
    this.showModal("export-modal");
    document.getElementById("export-password").focus();
  }

  showSettingsDialog() {
    this.loadSettings();
    this.showModal("settings-modal");
  }

  showPasswordDialog(message = "Enter password to decrypt notes") {
    const modal = document.getElementById("password-modal");
    const title = modal.querySelector("h3");
    title.textContent = message;
    this.showModal("password-modal");
    document.getElementById("password-input").focus();
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove("hidden");

    // Focus first input
    const firstInput = modal.querySelector("input");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add("hidden");
  }

  async handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".json")) {
      this.showNotification("Please select a valid JSON file", "error");
      e.target.value = "";
      return;
    }

    try {
      this.showLoadingIndicator(true);
      const text = await file.text();

      // Validate JSON format
      try {
        JSON.parse(text);
      } catch (jsonError) {
        throw new Error("Invalid JSON file format");
      }

      this.app.pendingImportData = text;
      this.showPasswordDialog("Enter password to decrypt imported notes");
    } catch (error) {
      console.error("Import error:", error);
      this.showNotification(
        "Failed to read import file: " + error.message,
        "error"
      );
    } finally {
      this.showLoadingIndicator(false);
      // Reset file input
      e.target.value = "";
    }
  }

  async handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      this.showLoadingIndicator(true);
      const imageData = await this.app.notesManager.compressImage(file);
      const rect = document.getElementById("canvas").getBoundingClientRect();
      const screenX = rect.left + rect.width / 2;
      const screenY = rect.top + rect.height / 2;
      const canvasPos = this.app.canvasManager.screenToCanvas(screenX, screenY);
      this.app.notesManager.createImageNote(
        canvasPos.x - 150,
        canvasPos.y - 100,
        imageData,
        file
      );
      this.app.autoSave(); // Auto-save after adding image
      this.showNotification("Image added successfully", "success");
    } catch (error) {
      console.error("Image upload error:", error);
      this.showNotification(
        "Failed to upload image. Please try again.",
        "error"
      );
    } finally {
      this.showLoadingIndicator(false);
      // Reset file input
      e.target.value = "";
    }
  }

  loadSettings() {
    const settings = this.app.getSettings();

    document.getElementById("grid-size").value = settings.gridSize;
    document.getElementById("autosave-interval").value =
      settings.autoSaveInterval;
    document.getElementById("show-grid").checked = settings.showGrid;
  }

  saveSettings() {
    const settings = {
      gridSize: parseInt(document.getElementById("grid-size").value),
      autoSaveInterval: parseInt(
        document.getElementById("autosave-interval").value
      ),
      showGrid: document.getElementById("show-grid").checked,
    };

    this.app.updateSettings(settings);
    this.showNotification("Settings saved!", "success");
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `fixed top-20 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;

    // Style based on type
    switch (type) {
      case "success":
        notification.className += " bg-green-600 text-white";
        break;
      case "error":
        notification.className += " bg-red-600 text-white";
        break;
      case "warning":
        notification.className += " bg-yellow-600 text-white";
        break;
      default:
        notification.className += " bg-blue-600 text-white";
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove("translate-x-full");
    }, 100);

    // Animate out and remove
    setTimeout(() => {
      notification.classList.add("translate-x-full");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  showLoadingIndicator(show = true) {
    let indicator = document.getElementById("loading-indicator");

    if (show) {
      if (!indicator) {
        indicator = document.createElement("div");
        indicator.id = "loading-indicator";
        indicator.className =
          "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm";
        indicator.innerHTML = `
                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-6 flex items-center space-x-3">
                        <div class="loading-spinner"></div>
                        <span>Loading...</span>
                    </div>
                `;
        document.body.appendChild(indicator);
      }
    } else {
      if (indicator) {
        indicator.remove();
      }
    }
  }

  updateCanvasInfo() {
    const zoomLevel = Math.round(this.app.canvasManager.zoomLevel * 100);
    const zoomDisplay = document.getElementById("zoom-level");
    if (zoomDisplay) {
      zoomDisplay.textContent = zoomLevel + "%";
    }
  }

  // Responsive design helpers
  isMobile() {
    return window.innerWidth <= 768;
  }

  // Accessibility helpers
  announceToScreenReader(message) {
    const announcement = document.createElement("div");
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", "polite");
    announcement.className = "sr-only";
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Touch gestures for mobile
  initTouchGestures() {
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    let lastTapTime = 0;

    const handleTouchStart = (e) => {
      touchStartTime = Date.now();
      if (e.touches.length === 1) {
        touchStartPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchEnd = (e) => {
      const touchDuration = Date.now() - touchStartTime;
      const touch = e.changedTouches[0];
      const touchEndPos = {
        x: touch.clientX,
        y: touch.clientY,
      };

      const distance = Math.sqrt(
        Math.pow(touchEndPos.x - touchStartPos.x, 2) +
          Math.pow(touchEndPos.y - touchStartPos.y, 2)
      );

      // Double tap to add text note
      if (touchDuration < 500 && distance < 10) {
        const now = Date.now();
        if (lastTapTime && now - lastTapTime < 300) {
          const canvasPos = this.app.canvasManager.screenToCanvas(
            touchEndPos.x,
            touchEndPos.y
          );
          this.app.notesManager.createTextNote(
            canvasPos.x - 150,
            canvasPos.y - 100
          );
        }
        lastTapTime = now;
      }
    };

    // Remove existing listeners if they exist to prevent memory leaks
    document.removeEventListener("touchstart", this.handleTouchStart);
    document.removeEventListener("touchend", this.handleTouchEnd);

    // Add new listeners
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    // Store references for cleanup
    this.handleTouchStart = handleTouchStart;
    this.handleTouchEnd = handleTouchEnd;
  }

  // Initialize tooltips
  initTooltips() {
    const tooltipElements = document.querySelectorAll("[title]");
    tooltipElements.forEach((element) => {
      let tooltip = null;

      element.addEventListener("mouseenter", (e) => {
        if (this.isMobile()) return;

        tooltip = document.createElement("div");
        tooltip.className =
          "fixed z-50 px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded shadow-lg pointer-events-none";
        tooltip.textContent = element.title;
        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left =
          rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + "px";

        // Remove title to prevent default tooltip
        element.removeAttribute("title");
        element.dataset.originalTitle = tooltip.textContent;
      });

      element.addEventListener("mouseleave", () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }

        // Restore title
        if (element.dataset.originalTitle) {
          element.title = element.dataset.originalTitle;
        }
      });
    });
  }
}

// Export for use in other modules
window.UIManager = UIManager;
