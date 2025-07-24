// Canvas Manager - Handles canvas operations, zoom, pan, and viewport
class CanvasManager {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.canvasContent = document.getElementById("canvas-content");
    this.zoomLevel = 1;
    this.minZoom = 0.1;
    this.maxZoom = 5;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.gridSize = 50;
    this.showGrid = true;

    // Touch/pinch zoom properties
    this.initialPinchDistance = null;
    this.initialZoom = null;

    // Track cursor position for zoom operations (both screen and canvas-relative)
    this.lastScreenX = null;
    this.lastScreenY = null;
    this.lastCursorX = null;
    this.lastCursorY = null;

    this.initEventListeners();
    this.updateGrid();
  }

  initEventListeners() {
    // Mouse events for panning
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseUp.bind(this));

    // Wheel event for zooming
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    );
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));

    // Keyboard shortcuts
    document.addEventListener("keydown", this.handleKeyDown.bind(this));

    // Update cursor position
    this.canvas.addEventListener(
      "mousemove",
      this.updateCursorPosition.bind(this)
    );
  }

  handleMouseDown(e) {
    // Allow dragging if clicking on canvas or empty space
    const isClickingOnNote = e.target.closest(".note") !== null;
    const isClickingOnUI =
      e.target.closest(".toolbar-btn, .modal, #context-menu, header") !== null;
    const isClickingOnInput = e.target.matches(
      "input, textarea, button, [contenteditable]"
    );

    // Always allow panning with middle mouse button
    if (e.button === 1) {
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }

    // Allow left mouse dragging on canvas background (not on notes or UI)
    if (
      e.button === 0 &&
      !isClickingOnNote &&
      !isClickingOnUI &&
      !isClickingOnInput
    ) {
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = "grabbing";
      e.preventDefault(); // Prevent text selection while dragging
    }
  }

  handleMouseMove(e) {
    if (this.isPanning) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.panX += deltaX;
      this.panY += deltaY;

      this.updateTransform();

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // Prevent text selection during drag
      e.preventDefault();
    }
  }

  handleMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = "grab";
    }
  }

  handleWheel(e) {
    e.preventDefault(); // Always prevent default scrolling

    const rect = this.canvas.getBoundingClientRect();
    // Calculate mouse position relative to the canvas element (not the content)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Debug logging
    if (this.zoomLevel !== 1) {
      console.log("Wheel event:", {
        clientX: e.clientX,
        clientY: e.clientY,
        rectLeft: rect.left,
        rectTop: rect.top,
        mouseX: mouseX,
        mouseY: mouseY,
        currentZoom: this.zoomLevel,
        currentPan: { x: this.panX, y: this.panY },
      });
    }

    // Zoom sensitivity - fine control like Figma
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const zoomFactor = 1 + delta;

    const oldZoom = this.zoomLevel;
    const newZoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, oldZoom * zoomFactor)
    );

    if (newZoom !== oldZoom) {
      // Convert mouse position to world coordinates before zoom
      // The formula: world = (screen - pan) / zoom
      const worldX = (mouseX - this.panX) / oldZoom;
      const worldY = (mouseY - this.panY) / oldZoom;

      // Update zoom level
      this.zoomLevel = newZoom;

      // Calculate new pan to keep the same world point under the mouse
      // The formula: pan = screen - world * zoom
      this.panX = mouseX - worldX * newZoom;
      this.panY = mouseY - worldY * newZoom;

      // Debug logging after transform
      console.log("After zoom:", {
        newZoom: this.zoomLevel,
        worldPoint: { x: worldX, y: worldY },
        newPan: { x: this.panX, y: this.panY },
      });

      this.updateTransform();
      this.updateZoomDisplay();
    }
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      this.handleMouseDown({
        button: 0, // Simulate left mouse button for panning
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: target,
        preventDefault: () => e.preventDefault(),
      });
    } else if (e.touches.length === 2) {
      // Store initial distance for pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.initialPinchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      this.initialZoom = this.zoomLevel;
    }
  }

  handleTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => e.preventDefault(),
      });
    } else if (e.touches.length === 2 && this.initialPinchDistance) {
      // Handle pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const zoomRatio = currentDistance / this.initialPinchDistance;
      const newZoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.initialZoom * zoomRatio)
      );

      if (newZoom !== this.zoomLevel) {
        // Center zoom between the two touches
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const rect = this.canvas.getBoundingClientRect();
        const touchX = centerX - rect.left;
        const touchY = centerY - rect.top;

        // Use the same algorithm as other zoom functions
        const oldZoom = this.zoomLevel;
        const worldX = (touchX - this.panX) / oldZoom;
        const worldY = (touchY - this.panY) / oldZoom;

        this.zoomLevel = newZoom;

        this.panX = touchX - worldX * newZoom;
        this.panY = touchY - worldY * newZoom;

        this.updateTransform();
        this.updateZoomDisplay();
      }
    }
  }

  handleTouchEnd() {
    this.handleMouseUp();
    // Reset pinch zoom state
    this.initialPinchDistance = null;
    this.initialZoom = null;
  }

  handleKeyDown(e) {
    // Don't interfere when typing in inputs
    if (e.target.matches("input, textarea, [contenteditable]")) {
      return;
    }

    // Zoom shortcuts (like Figma)
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "=":
        case "+":
          e.preventDefault();
          // Use last cursor position or center if cursor hasn't moved yet
          this.zoomIn();
          break;
        case "-":
          e.preventDefault();
          // Use last cursor position or center if cursor hasn't moved yet
          this.zoomOut();
          break;
        case "0":
          e.preventDefault();
          this.resetZoom();
          break;
      }
    }

    // Pan shortcuts
    if (!e.ctrlKey && !e.metaKey) {
      const panSpeed = 100;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          this.panY += panSpeed;
          this.updateTransform();
          break;
        case "ArrowDown":
          e.preventDefault();
          this.panY -= panSpeed;
          this.updateTransform();
          break;
        case "ArrowLeft":
          e.preventDefault();
          this.panX += panSpeed;
          this.updateTransform();
          break;
        case "ArrowRight":
          e.preventDefault();
          this.panX -= panSpeed;
          this.updateTransform();
          break;
      }
    }
  }

  updateTransform() {
    // Use matrix transformation with explicit transform-origin
    this.canvasContent.style.transformOrigin = "0 0";
    this.canvasContent.style.transform = `matrix(${this.zoomLevel}, 0, 0, ${this.zoomLevel}, ${this.panX}, ${this.panY})`;
    this.updateGrid();
  }

  updateGrid() {
    const gridBackground = document.getElementById("grid-background");
    if (this.showGrid) {
      const scaledGridSize = this.gridSize * this.zoomLevel;
      gridBackground.style.backgroundSize = `${scaledGridSize}px ${scaledGridSize}px`;
      gridBackground.style.backgroundPosition = `${
        this.panX % scaledGridSize
      }px ${this.panY % scaledGridSize}px`;
      gridBackground.style.display = "block";
    } else {
      gridBackground.style.display = "none";
    }
  }

  updateZoomDisplay() {
    const zoomDisplay = document.getElementById("zoom-level");
    if (zoomDisplay) {
      zoomDisplay.textContent = Math.round(this.zoomLevel * 100) + "%";

      // Add a brief highlight effect when zoom changes
      zoomDisplay.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
      zoomDisplay.style.transform = "scale(1.1)";

      setTimeout(() => {
        zoomDisplay.style.backgroundColor = "";
        zoomDisplay.style.transform = "";
      }, 200);
    }
  }

  updateCursorPosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    // Store both screen and canvas-relative cursor positions for zoom operations
    this.lastScreenX = e.clientX;
    this.lastScreenY = e.clientY;
    this.lastCursorX = e.clientX - rect.left;
    this.lastCursorY = e.clientY - rect.top;
  }

  zoomIn(targetX = null, targetY = null) {
    const rect = this.canvas.getBoundingClientRect();
    // Use provided coordinates, latest mouse position, or center
    let zoomPointX, zoomPointY;
    if (targetX !== null && targetY !== null) {
      zoomPointX = targetX;
      zoomPointY = targetY;
    } else if (this.lastCursorX !== null && this.lastCursorY !== null) {
      // Use canvas-relative coordinates stored from last mouse move
      zoomPointX = this.lastCursorX;
      zoomPointY = this.lastCursorY;
    } else {
      // Use center of canvas
      zoomPointX = rect.width / 2;
      zoomPointY = rect.height / 2;
    }

    const oldZoom = this.zoomLevel;
    const newZoom = Math.min(this.maxZoom, this.zoomLevel * 1.2);

    if (newZoom !== oldZoom) {
      // Convert zoom point to world coordinates before zoom
      const worldX = (zoomPointX - this.panX) / oldZoom;
      const worldY = (zoomPointY - this.panY) / oldZoom;

      // Update zoom level
      this.zoomLevel = newZoom;

      // Calculate new pan to keep world point at same screen position
      this.panX = zoomPointX - worldX * newZoom;
      this.panY = zoomPointY - worldY * newZoom;

      this.updateTransform();
      this.updateZoomDisplay();
    }
  }

  zoomOut(targetX = null, targetY = null) {
    const rect = this.canvas.getBoundingClientRect();
    // Use provided coordinates, latest mouse position, or center
    let zoomPointX, zoomPointY;
    if (targetX !== null && targetY !== null) {
      zoomPointX = targetX;
      zoomPointY = targetY;
    } else if (this.lastCursorX !== null && this.lastCursorY !== null) {
      // Use canvas-relative coordinates stored from last mouse move
      zoomPointX = this.lastCursorX;
      zoomPointY = this.lastCursorY;
    } else {
      // Use center of canvas
      zoomPointX = rect.width / 2;
      zoomPointY = rect.height / 2;
    }

    const oldZoom = this.zoomLevel;
    const newZoom = Math.max(this.minZoom, this.zoomLevel / 1.2);

    if (newZoom !== oldZoom) {
      // Convert zoom point to world coordinates before zoom
      const worldX = (zoomPointX - this.panX) / oldZoom;
      const worldY = (zoomPointY - this.panY) / oldZoom;

      // Update zoom level
      this.zoomLevel = newZoom;

      // Calculate new pan to keep world point at same screen position
      this.panX = zoomPointX - worldX * newZoom;
      this.panY = zoomPointY - worldY * newZoom;

      this.updateTransform();
      this.updateZoomDisplay();
    }
  }

  resetZoom() {
    const rect = this.canvas.getBoundingClientRect();
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
    this.updateZoomDisplay();
  }

  // Convert screen coordinates to canvas coordinates
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();

    // Convert screen coordinates to canvas-relative coordinates
    const canvasRelativeX = screenX - rect.left;
    const canvasRelativeY = screenY - rect.top;

    // Apply inverse transformation: (canvas_relative - pan) / zoom = world
    const worldX = (canvasRelativeX - this.panX) / this.zoomLevel;
    const worldY = (canvasRelativeY - this.panY) / this.zoomLevel;

    return { x: worldX, y: worldY };
  }

  // Convert canvas coordinates to screen coordinates
  canvasToScreen(canvasX, canvasY) {
    const rect = this.canvas.getBoundingClientRect();

    // Apply transformation: world * zoom + pan = canvas_relative
    const canvasRelativeX = canvasX * this.zoomLevel + this.panX;
    const canvasRelativeY = canvasY * this.zoomLevel + this.panY;

    // Convert to absolute screen coordinates
    const screenX = canvasRelativeX + rect.left;
    const screenY = canvasRelativeY + rect.top;

    return { x: screenX, y: screenY };
  }

  // Center view on a specific point
  centerOn(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    this.panX = rect.width / 2 - x * this.zoomLevel;
    this.panY = rect.height / 2 - y * this.zoomLevel;
    this.updateTransform();
  }

  // Fit all notes in view
  fitToView(notes) {
    if (notes.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    notes.forEach((note) => {
      minX = Math.min(minX, note.x);
      minY = Math.min(minY, note.y);
      maxX = Math.max(maxX, note.x + note.width);
      maxY = Math.max(maxY, note.y + note.height);
    });

    const padding = 100;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    this.zoomLevel = scale;
    this.centerOn((minX + maxX) / 2, (minY + maxY) / 2);
    this.updateZoomDisplay();
  }

  setGridSize(size) {
    this.gridSize = size;
    this.updateGrid();
  }

  setGridVisibility(visible) {
    this.showGrid = visible;
    this.updateGrid();
  }

  getViewportBounds() {
    const rect = this.canvas.getBoundingClientRect();
    const topLeft = this.screenToCanvas(rect.left, rect.top);
    const bottomRight = this.screenToCanvas(
      rect.left + rect.width,
      rect.top + rect.height
    );

    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  // Debug function to verify coordinate transformations
  debugCoordinates(screenX, screenY) {
    const world = this.screenToCanvas(screenX, screenY);
    const backToScreen = this.canvasToScreen(world.x, world.y);
    const rect = this.canvas.getBoundingClientRect();

    console.log({
      input: { screenX, screenY },
      canvasRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      canvasRelative: { x: screenX - rect.left, y: screenY - rect.top },
      world: { x: world.x, y: world.y },
      backToScreen: { x: backToScreen.x, y: backToScreen.y },
      difference: {
        x: Math.abs(screenX - backToScreen.x),
        y: Math.abs(screenY - backToScreen.y),
      },
      zoom: this.zoomLevel,
      pan: { x: this.panX, y: this.panY },
    });
  }
}

// Export for use in other modules
window.CanvasManager = CanvasManager;

// Add global debug functions for testing coordinates
window.testCoordinates = function () {
  if (window.app && window.app.canvasManager) {
    const cm = window.app.canvasManager;
    const rect = cm.canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    console.log("=== COORDINATE TEST ===");
    console.log("Canvas rect:", rect);
    console.log("Screen center:", { x: centerX, y: centerY });

    const worldCenter = cm.screenToCanvas(centerX, centerY);
    console.log("World center should be close to (0,0):", worldCenter);

    // Test if world center transforms back to screen center
    const backToScreen = cm.canvasToScreen(worldCenter.x, worldCenter.y);
    console.log("Back to screen:", backToScreen);

    const diff = {
      x: Math.abs(centerX - backToScreen.x),
      y: Math.abs(centerY - backToScreen.y),
    };
    console.log("Difference (should be < 1):", diff);
    console.log(
      "Current transform - Pan:",
      { x: cm.panX, y: cm.panY },
      "Zoom:",
      cm.zoomLevel
    );

    return diff.x < 1 && diff.y < 1 ? "COORDINATES OK" : "COORDINATES BROKEN";
  }
  return "App not ready";
};
window.debugZoom = function () {
  if (window.app && window.app.canvasManager) {
    const canvas = window.app.canvasManager;
    console.log("=== ZOOM DEBUG INFO ===");
    console.log("Zoom Level:", canvas.zoomLevel);
    console.log("Pan:", { x: canvas.panX, y: canvas.panY });
    console.log("Last Cursor:", {
      x: canvas.lastCursorX,
      y: canvas.lastCursorY,
    });

    // Test coordinate transformation at cursor position
    if (canvas.lastCursorX && canvas.lastCursorY) {
      const rect = canvas.canvas.getBoundingClientRect();
      const screenX = rect.left + canvas.lastCursorX;
      const screenY = rect.top + canvas.lastCursorY;
      canvas.debugCoordinates(screenX, screenY);
    }
  }
};
