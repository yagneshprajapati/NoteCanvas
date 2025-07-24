// Notes Manager - Handles note creation, editing, and management
class NotesManager {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.notes = new Map();
    this.selectedNote = null;
    this.selectedNotes = new Set(); // Multi-selection support
    this.nextId = 1;
    this.isDragging = false;
    this.isResizing = false;
    this.dragOffset = { x: 0, y: 0 };
    this.resizeHandle = null;
    this.imageCompressionQuality = 0.7;
    this.maxImageSize = 1024;

    // Selection box for multi-select
    this.isSelecting = false;
    this.selectionStart = { x: 0, y: 0 };
    this.selectionEnd = { x: 0, y: 0 };
    this.selectionBox = null;

    // Multi-drag support
    this.multiDragOffsets = new Map();

    this.initEventListeners();
  }

  initEventListeners() {
    // Global mouse events
    document.addEventListener(
      "mousedown",
      this.handleGlobalMouseDown.bind(this)
    );
    document.addEventListener(
      "mousemove",
      this.handleGlobalMouseMove.bind(this)
    );
    document.addEventListener("mouseup", this.handleGlobalMouseUp.bind(this));

    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown.bind(this));

    // Paste events
    document.addEventListener("paste", this.handlePaste.bind(this));

    // Context menu initialization
    this.initContextMenu();

    // Add document click listener for markdown conversion
    document.addEventListener("click", (e) => {
      // If clicking outside any note, convert all to markdown
      if (
        !e.target.closest(".note") &&
        !e.target.closest(".toolbar-btn, .modal, #context-menu, header")
      ) {
        setTimeout(() => {
          this.convertAllTextNotesToMarkdown();
        }, 50);
      }
    });
  }
  initContextMenu() {
    const contextMenu = document.getElementById("context-menu");
    const items = contextMenu.querySelectorAll(".context-menu-item");

    items.forEach((item) => {
      item.addEventListener("click", () => {
        const action = item.dataset.action;
        const noteId = contextMenu.dataset.noteId;
        if (noteId) {
          this.handleContextMenuAction(action, noteId);
          this.hideContextMenu();
        }
      });
    });
  }

  createTextNote(x, y) {
    const id = "note_" + this.nextId++;
    const note = {
      id: id,
      type: "text",
      x: x,
      y: y,
      width: 300,
      height: 200,
      content: "# New Note\n\nClick to edit...",
      zIndex: this.getMaxZIndex() + 1,
      created: Date.now(),
      modified: Date.now(),
    };

    this.notes.set(id, note);
    this.renderNote(note);
    this.selectNote(id);
    this.focusNoteContent(id);

    return note;
  }

  createImageNote(x, y, imageData, originalFile = null) {
    const id = "note_" + this.nextId++;
    const note = {
      id: id,
      type: "image",
      x: x,
      y: y,
      width: 300,
      height: 200,
      content: imageData,
      originalSize: originalFile ? originalFile.size : null,
      zIndex: this.getMaxZIndex() + 1,
      created: Date.now(),
      modified: Date.now(),
    };

    this.notes.set(id, note);
    this.renderNote(note);
    this.selectNote(id);

    return note;
  }

  renderNote(note) {
    const noteElement = document.createElement("div");
    noteElement.id = note.id;
    noteElement.className = "note";
    noteElement.style.left = note.x + "px";
    noteElement.style.top = note.y + "px";
    noteElement.style.width = note.width + "px";
    noteElement.style.height = note.height + "px";
    noteElement.style.zIndex = note.zIndex;

    if (note.type === "text") {
      noteElement.innerHTML = `
                <textarea class="note-content note-text" placeholder="Type your note here...">${
                  note.content
                }</textarea>
                <button class="note-toggle" title="Toggle View/Code">View</button>
                ${this.createResizeHandles()}
            `;

      const textarea = noteElement.querySelector(".note-text");
      const toggleBtn = noteElement.querySelector(".note-toggle");

      // Handle input changes
      textarea.addEventListener("input", () => {
        note.content = textarea.value;
        note.modified = Date.now();
        document.dispatchEvent(new CustomEvent("note-modified"));
      });

      // Handle when user finishes editing (blur event)
      textarea.addEventListener("blur", (e) => {
        // Remove focused class and convert to markdown after a short delay
        setTimeout(() => {
          if (
            !textarea.matches(":focus") &&
            document.activeElement !== textarea
          ) {
            noteElement.classList.remove("focused");
            this.renderMarkdown(textarea, note.content);
          }
        }, 100);
      });

      // Handle when user starts editing (focus event)
      textarea.addEventListener("focus", () => {
        // Add focused class and show textarea when focused
        noteElement.classList.add("focused");
        textarea.style.display = "block";
        const markdownDiv = noteElement.querySelector(".markdown-content");
        if (markdownDiv) {
          markdownDiv.style.display = "none";
        }
        toggleBtn.textContent = "View";
        toggleBtn.classList.remove("active");
      });

      // Handle toggle button
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();

        const markdownDiv = noteElement.querySelector(".markdown-content");
        const isShowingCode = textarea.style.display !== "none";

        if (isShowingCode) {
          // Switch to view mode
          if (markdownDiv) {
            textarea.style.display = "none";
            markdownDiv.style.display = "block";
            toggleBtn.textContent = "Code";
            toggleBtn.classList.add("active");
          }
        } else {
          // Switch to code mode
          textarea.style.display = "block";
          if (markdownDiv) {
            markdownDiv.style.display = "none";
          }
          toggleBtn.textContent = "View";
          toggleBtn.classList.remove("active");
          textarea.focus();
        }
      });

      // Initial markdown render
      this.renderMarkdown(textarea, note.content);
    } else if (note.type === "image") {
      const img = document.createElement("img");
      img.src = note.content;
      img.className = "note-content note-image";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";

      noteElement.appendChild(img);

      // Add resize handles properly without destroying existing elements
      const resizeHandlesHTML = this.createResizeHandles();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = resizeHandlesHTML;
      while (tempDiv.firstChild) {
        noteElement.appendChild(tempDiv.firstChild);
      }

      // Add compression indicator if image was compressed
      if (note.originalSize && note.content.length < note.originalSize * 0.8) {
        img.classList.add("image-compressed");
      }
    }

    // Add animation
    noteElement.classList.add("note-appear");

    document.getElementById("canvas-content").appendChild(noteElement);

    // Add event listeners
    this.addNoteEventListeners(noteElement, note);
  }
  addNoteEventListeners(noteElement, note) {
    // Note selection and dragging
    noteElement.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("resize-handle")) {
        this.startResize(e, note.id, e.target.classList[1]);
      } else if (
        !e.target.classList.contains("note-text") &&
        !e.target.classList.contains("note-toggle")
      ) {
        // Handle multi-selection with Ctrl/Cmd
        const addToSelection = e.ctrlKey || e.metaKey;

        if (addToSelection && this.selectedNotes.has(note.id)) {
          // Remove from selection if already selected
          this.removeFromSelection(note.id);
          e.preventDefault();
          return;
        }

        this.startDrag(e, note.id, addToSelection);
      }
    });

    // Context menu
    noteElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      // If note is not selected, select it first
      if (!this.selectedNotes.has(note.id)) {
        this.selectNote(note.id);
      }
      this.showContextMenu(e, note.id);
    });

    // Double click to edit
    noteElement.addEventListener("dblclick", (e) => {
      if (note.type === "text") {
        this.focusNoteContent(note.id);
      }
    });

    // Hover effects for better UX
    noteElement.addEventListener("mouseenter", () => {
      if (!this.isDragging && !this.isResizing && !this.isSelecting) {
        noteElement.style.transform = "scale(1.02)";
        noteElement.style.transition = "transform 0.1s ease-out";
      }
    });

    noteElement.addEventListener("mouseleave", () => {
      if (!this.isDragging && !this.isResizing) {
        noteElement.style.transform = "scale(1)";
      }
    });
  }

  createResizeHandles() {
    return `
            <div class="resize-handle nw"></div>
            <div class="resize-handle n"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle w"></div>
            <div class="resize-handle e"></div>
            <div class="resize-handle sw"></div>
            <div class="resize-handle s"></div>
            <div class="resize-handle se"></div>
        `;
  }

  renderMarkdown(textarea, content) {
    // Always check if textarea is focused before rendering
    if (textarea.matches(":focus") || document.activeElement === textarea) {
      return;
    }

    const noteElement = textarea.closest(".note");
    let markdownDiv = noteElement.querySelector(".markdown-content");

    if (!markdownDiv) {
      markdownDiv = document.createElement("div");
      markdownDiv.className = "markdown-content note-content";
      markdownDiv.style.cssText = `
                width: 100%;
                height: 100%;
                padding: 1rem;
                background-color: rgba(55, 65, 81, 0.95);
                backdrop-filter: blur(4px);
                border-radius: 0.5rem;
                display: none;
                overflow: auto;
                cursor: text;
                border: none;
                outline: none;
                font-size: 14px;
                line-height: 1.6;
                position: relative;
            `;

      // Add markdown controls
      const controls = document.createElement("div");
      controls.className = "markdown-controls";
      controls.innerHTML = `
                <button class="markdown-control-btn copy-btn" title="Copy Content">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="markdown-control-btn edit-btn" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="markdown-control-btn select-btn" title="Select Text">
                    <i class="fas fa-mouse-pointer"></i>
                </button>
            `;
      markdownDiv.appendChild(controls);

      // Handle control buttons
      const copyBtn = controls.querySelector(".copy-btn");
      const editBtn = controls.querySelector(".edit-btn");
      const selectBtn = controls.querySelector(".select-btn");

      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.copyMarkdownContent(markdownDiv, textarea.value);
      });

      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.switchToEditMode(noteElement, textarea, markdownDiv);
      });

      selectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMarkdownSelection(markdownDiv);
      });

      // Click to select (not edit immediately)
      markdownDiv.addEventListener("click", (e) => {
        // Don't trigger if clicking on controls or code copy buttons
        if (
          e.target.closest(".markdown-controls") ||
          e.target.closest(".copy-code-btn")
        ) {
          return;
        }

        e.stopPropagation();
        this.selectMarkdownContent(markdownDiv);
      });

      // Double click to edit
      markdownDiv.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.switchToEditMode(noteElement, textarea, markdownDiv);
      });

      noteElement.insertBefore(markdownDiv, textarea);
    }

    // Render the markdown content
    try {
      if (typeof marked !== "undefined" && content.trim()) {
        // Configure marked for better rendering
        marked.setOptions({
          breaks: true,
          gfm: true,
          sanitize: false,
          highlight: function (code, language) {
            if (window.Prism && language && Prism.languages[language]) {
              return Prism.highlight(code, Prism.languages[language], language);
            }
            return code;
          },
        });

        let html = marked.parse(content);

        // Enhance code blocks with copy functionality
        html = this.enhanceCodeBlocks(html);

        markdownDiv.innerHTML = html;

        // Apply syntax highlighting to any remaining code blocks
        if (window.Prism) {
          Prism.highlightAllUnder(markdownDiv);
        }

        // Render math expressions if MathJax is available
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise([markdownDiv]).catch((err) => {
            console.warn("MathJax typeset failed:", err);
          });
        }

        // Add controls back if they were removed
        if (!markdownDiv.querySelector(".markdown-controls")) {
          const controls = document.createElement("div");
          controls.className = "markdown-controls";
          controls.innerHTML = `
                    <button class="markdown-control-btn copy-btn" title="Copy Content">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="markdown-control-btn edit-btn" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="markdown-control-btn select-btn" title="Select Text">
                        <i class="fas fa-mouse-pointer"></i>
                    </button>
                `;
          markdownDiv.appendChild(controls);

          // Re-add event listeners
          this.addControlListeners(
            controls,
            noteElement,
            textarea,
            markdownDiv
          );
        }
      } else {
        // Fallback for simple text formatting
        const html = content
          .replace(/\n/g, "<br>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>");

        markdownDiv.innerHTML = html;
      }
    } catch (error) {
      console.error("Markdown parsing error:", error);
      markdownDiv.innerHTML = content.replace(/\n/g, "<br>");
    }

    // Add copy functionality to all code blocks
    this.addCopyFunctionalityToCodeBlocks(markdownDiv);

    // Show markdown, hide textarea
    markdownDiv.style.display = "block";
    textarea.style.display = "none";

    // Update toggle button state
    const toggleBtn = noteElement.querySelector(".note-toggle");
    if (toggleBtn) {
      toggleBtn.textContent = "Code";
      toggleBtn.classList.add("active");
    }
  }

  enhanceCodeBlocks(html) {
    // Replace pre code blocks with enhanced versions
    return html.replace(
      /<pre><code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g,
      (match, language, code) => {
        const lang = language || "text";
        const decodedCode = code
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        return `
        <div class="code-block-container">
          <div class="code-block-header">
            <span class="code-block-language">${lang}</span>
            <button class="copy-code-btn" data-code="${encodeURIComponent(
              decodedCode
            )}">
              <i class="fas fa-copy"></i>
              Copy
            </button>
          </div>
          <pre><code class="language-${lang}">${code}</code></pre>
        </div>
      `;
      }
    );
  }

  addControlListeners(controls, noteElement, textarea, markdownDiv) {
    const copyBtn = controls.querySelector(".copy-btn");
    const editBtn = controls.querySelector(".edit-btn");
    const selectBtn = controls.querySelector(".select-btn");

    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.copyMarkdownContent(markdownDiv, textarea.value);
    });

    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.switchToEditMode(noteElement, textarea, markdownDiv);
    });

    selectBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMarkdownSelection(markdownDiv);
    });
  }

  addCopyFunctionalityToCodeBlocks(markdownDiv) {
    const copyButtons = markdownDiv.querySelectorAll(".copy-code-btn");
    copyButtons.forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.stopPropagation();
        const code = decodeURIComponent(button.dataset.code);

        try {
          await navigator.clipboard.writeText(code);

          // Visual feedback
          const originalHTML = button.innerHTML;
          button.innerHTML = '<i class="fas fa-check"></i> Copied!';
          button.classList.add("copied");

          setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove("copied");
          }, 2000);
        } catch (err) {
          console.error("Failed to copy code:", err);
          // Fallback for older browsers
          this.fallbackCopyTextToClipboard(code);
        }
      });
    });
  }

  async copyMarkdownContent(markdownDiv, rawContent) {
    try {
      // Copy the raw markdown content
      await navigator.clipboard.writeText(rawContent);

      // Visual feedback
      const copyBtn = markdownDiv.querySelector(".copy-btn");
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      copyBtn.style.color = "#10b981";

      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.style.color = "";
      }, 2000);
    } catch (err) {
      console.error("Failed to copy content:", err);
      this.fallbackCopyTextToClipboard(rawContent);
    }
  }

  fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }

    document.body.removeChild(textArea);
  }

  switchToEditMode(noteElement, textarea, markdownDiv) {
    noteElement.classList.add("focused");
    textarea.style.display = "block";
    markdownDiv.style.display = "none";
    markdownDiv.classList.remove("selected");
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // Update toggle button state
    const toggleBtn = noteElement.querySelector(".note-toggle");
    if (toggleBtn) {
      toggleBtn.textContent = "View";
      toggleBtn.classList.remove("active");
    }
  }

  selectMarkdownContent(markdownDiv) {
    // Remove selection from other markdown elements
    document.querySelectorAll(".markdown-content.selected").forEach((el) => {
      if (el !== markdownDiv) {
        el.classList.remove("selected");
      }
    });

    // Toggle selection on clicked element
    markdownDiv.classList.toggle("selected");

    // Enable text selection when selected
    if (markdownDiv.classList.contains("selected")) {
      markdownDiv.style.userSelect = "text";
      markdownDiv.style.webkitUserSelect = "text";
    } else {
      markdownDiv.style.userSelect = "none";
      markdownDiv.style.webkitUserSelect = "none";
    }
  }

  toggleMarkdownSelection(markdownDiv) {
    markdownDiv.classList.toggle("selected");

    if (markdownDiv.classList.contains("selected")) {
      markdownDiv.style.userSelect = "text";
      markdownDiv.style.webkitUserSelect = "text";

      // Auto-select all text
      const range = document.createRange();
      range.selectNodeContents(markdownDiv);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      markdownDiv.style.userSelect = "none";
      markdownDiv.style.webkitUserSelect = "none";

      // Clear selection
      window.getSelection().removeAllRanges();
    }
  }

  startDrag(e, noteId, addToSelection = false) {
    e.preventDefault();
    e.stopPropagation();

    // Handle selection based on modifier keys and current state
    if (addToSelection) {
      if (this.selectedNotes.has(noteId)) {
        // If already selected and we're in multi-select mode, don't deselect
        // The drag will move all selected notes
      } else {
        this.addToSelection(noteId);
      }
    } else if (!this.selectedNotes.has(noteId)) {
      // If not in multi-select mode and note isn't selected, select it alone
      this.selectNote(noteId);
    }
    // If note is already selected and we're not adding to selection,
    // just start dragging all selected notes

    this.isDragging = true;
    const canvasPos = this.canvasManager.screenToCanvas(e.clientX, e.clientY);

    if (this.selectedNotes.size > 1) {
      // Multi-drag mode: calculate offsets for all selected notes
      this.multiDragOffsets.clear();
      this.selectedNotes.forEach((selectedNoteId) => {
        const selectedNote = this.notes.get(selectedNoteId);
        if (selectedNote) {
          this.multiDragOffsets.set(selectedNoteId, {
            x: canvasPos.x - selectedNote.x,
            y: canvasPos.y - selectedNote.y,
          });
        }
      });
    } else {
      // Single drag mode
      const note = this.notes.get(noteId);
      this.dragOffset = {
        x: canvasPos.x - note.x,
        y: canvasPos.y - note.y,
      };
    }
  }

  startResize(e, noteId, handle) {
    e.preventDefault();
    e.stopPropagation();

    this.selectNote(noteId);
    this.isResizing = true;
    this.resizeHandle = handle;
    this.resizeStartPos = this.canvasManager.screenToCanvas(
      e.clientX,
      e.clientY
    );

    const note = this.notes.get(noteId);
    this.resizeStartBounds = {
      x: note.x,
      y: note.y,
      width: note.width,
      height: note.height,
    };
  }

  handleGlobalMouseDown(e) {
    // Deselect if clicking anywhere that's not a note, UI element, or input
    const isClickingOnNote = e.target.closest(".note") !== null;
    const isClickingOnUI =
      e.target.closest(".toolbar-btn, .modal, #context-menu, header") !== null;
    const isClickingOnInput = e.target.matches(
      "input, textarea, button, [contenteditable]"
    );

    if (!isClickingOnNote && !isClickingOnUI && !isClickingOnInput) {
      // Start selection box if on canvas
      if (e.target.closest("#canvas")) {
        this.startSelection(e);
      } else {
        this.deselectAll();
      }

      // Convert all text notes to markdown when clicking outside
      setTimeout(() => {
        this.convertAllTextNotesToMarkdown();
      }, 50);
    }
  }

  convertAllTextNotesToMarkdown() {
    // Get all textareas that are not currently focused
    const textareas = document.querySelectorAll(".note-text");
    textareas.forEach((textarea) => {
      if (!textarea.matches(":focus") && document.activeElement !== textarea) {
        const noteElement = textarea.closest(".note");
        if (noteElement) {
          const noteId = noteElement.id.replace("note-", "");
          const note = this.notes.get(noteId);
          if (note && note.type === "text") {
            this.renderMarkdown(textarea, note.content);
          }
        }
      }
    });
  }

  handleGlobalMouseMove(e) {
    if (this.isSelecting) {
      this.updateSelection(e);
    } else if (
      this.isDragging &&
      (this.selectedNote || this.selectedNotes.size > 0)
    ) {
      const canvasPos = this.canvasManager.screenToCanvas(e.clientX, e.clientY);

      if (this.selectedNotes.size > 1) {
        // Multi-drag mode: move all selected notes
        this.selectedNotes.forEach((noteId) => {
          const note = this.notes.get(noteId);
          const offset = this.multiDragOffsets.get(noteId);
          if (note && offset) {
            note.x = canvasPos.x - offset.x;
            note.y = canvasPos.y - offset.y;
            note.modified = Date.now();
            this.updateNotePosition(note);
          }
        });
      } else if (this.selectedNote) {
        // Single drag mode
        const note = this.notes.get(this.selectedNote);
        if (note) {
          note.x = canvasPos.x - this.dragOffset.x;
          note.y = canvasPos.y - this.dragOffset.y;
          note.modified = Date.now();
          this.updateNotePosition(note);
        }
      }
    } else if (this.isResizing && this.selectedNote) {
      const canvasPos = this.canvasManager.screenToCanvas(e.clientX, e.clientY);
      const note = this.notes.get(this.selectedNote);
      if (note) {
        this.resizeNote(note, canvasPos);
      }
    }
  }

  handleGlobalMouseUp() {
    if (this.isDragging || this.isResizing) {
      // Trigger auto-save after drag or resize operations
      document.dispatchEvent(new CustomEvent("note-modified"));

      // Reset any visual transform effects
      if (this.selectedNotes.size > 0) {
        this.selectedNotes.forEach((noteId) => {
          const noteElement = document.getElementById(noteId);
          if (noteElement) {
            noteElement.style.transform = "scale(1)";
          }
        });
      } else if (this.selectedNote) {
        const noteElement = document.getElementById(this.selectedNote);
        if (noteElement) {
          noteElement.style.transform = "scale(1)";
        }
      }
    }

    if (this.isSelecting) {
      this.endSelection();
    }

    this.isDragging = false;
    this.isResizing = false;
    this.isSelecting = false;
    this.resizeHandle = null;
    this.multiDragOffsets.clear();
  }

  resizeNote(note, currentPos) {
    const startBounds = this.resizeStartBounds;
    const deltaX = currentPos.x - this.resizeStartPos.x;
    const deltaY = currentPos.y - this.resizeStartPos.y;

    const minSize = 100;
    let newBounds = { ...startBounds };

    switch (this.resizeHandle) {
      case "se":
        newBounds.width = Math.max(minSize, startBounds.width + deltaX);
        newBounds.height = Math.max(minSize, startBounds.height + deltaY);
        break;
      case "sw":
        newBounds.width = Math.max(minSize, startBounds.width - deltaX);
        newBounds.height = Math.max(minSize, startBounds.height + deltaY);
        newBounds.x = startBounds.x + startBounds.width - newBounds.width;
        break;
      case "ne":
        newBounds.width = Math.max(minSize, startBounds.width + deltaX);
        newBounds.height = Math.max(minSize, startBounds.height - deltaY);
        newBounds.y = startBounds.y + startBounds.height - newBounds.height;
        break;
      case "nw":
        newBounds.width = Math.max(minSize, startBounds.width - deltaX);
        newBounds.height = Math.max(minSize, startBounds.height - deltaY);
        newBounds.x = startBounds.x + startBounds.width - newBounds.width;
        newBounds.y = startBounds.y + startBounds.height - newBounds.height;
        break;
      case "n":
        newBounds.height = Math.max(minSize, startBounds.height - deltaY);
        newBounds.y = startBounds.y + startBounds.height - newBounds.height;
        break;
      case "s":
        newBounds.height = Math.max(minSize, startBounds.height + deltaY);
        break;
      case "e":
        newBounds.width = Math.max(minSize, startBounds.width + deltaX);
        break;
      case "w":
        newBounds.width = Math.max(minSize, startBounds.width - deltaX);
        newBounds.x = startBounds.x + startBounds.width - newBounds.width;
        break;
    }

    Object.assign(note, newBounds);
    note.modified = Date.now();
    this.updateNotePosition(note);
  }

  updateNotePosition(note) {
    const noteElement = document.getElementById(note.id);
    if (noteElement) {
      noteElement.style.left = note.x + "px";
      noteElement.style.top = note.y + "px";
      noteElement.style.width = note.width + "px";
      noteElement.style.height = note.height + "px";
    }
  }

  selectNote(noteId, addToSelection = false) {
    if (addToSelection && (this.selectedNote || this.selectedNotes.size > 0)) {
      // Add to existing selection
      this.addToSelection(noteId);
    } else {
      // Single selection (clear others first)
      this.deselectAll();
      this.selectedNote = noteId;
      this.selectedNotes.add(noteId);

      const noteElement = document.getElementById(noteId);
      if (noteElement) {
        noteElement.classList.add("selected");

        // Bring to front
        const note = this.notes.get(noteId);
        note.zIndex = this.getMaxZIndex() + 1;
        noteElement.style.zIndex = note.zIndex;
      }
    }
  }

  addToSelection(noteId) {
    if (this.selectedNote && !this.selectedNotes.has(this.selectedNote)) {
      this.selectedNotes.add(this.selectedNote);
    }

    this.selectedNotes.add(noteId);
    this.selectedNote = noteId; // Keep track of the primary selection

    const noteElement = document.getElementById(noteId);
    if (noteElement) {
      noteElement.classList.add("selected");
      noteElement.classList.add("multi-selected");
    }

    this.updateMultiSelectionUI();
  }

  removeFromSelection(noteId) {
    this.selectedNotes.delete(noteId);

    const noteElement = document.getElementById(noteId);
    if (noteElement) {
      noteElement.classList.remove("selected");
      noteElement.classList.remove("multi-selected");
    }

    if (this.selectedNote === noteId) {
      this.selectedNote =
        this.selectedNotes.size > 0 ? Array.from(this.selectedNotes)[0] : null;
    }

    this.updateMultiSelectionUI();
  }

  updateMultiSelectionUI() {
    // Update visual indicators for multi-selection
    document.querySelectorAll(".note").forEach((noteEl) => {
      const noteId = noteEl.id;
      if (this.selectedNotes.has(noteId)) {
        noteEl.classList.add("selected");
        if (this.selectedNotes.size > 1) {
          noteEl.classList.add("multi-selected");
        } else {
          noteEl.classList.remove("multi-selected");
        }
      } else {
        noteEl.classList.remove("selected", "multi-selected");
      }
    });

    // Update selection counter in header
    this.updateSelectionCounter();
  }

  updateSelectionCounter() {
    const selectionCount = document.getElementById("selection-count");
    const selectionNumber = document.getElementById("selection-number");
    const multiSelectionTooltip = document.getElementById(
      "multi-selection-tooltip"
    );

    if (this.selectedNotes.size > 0) {
      selectionNumber.textContent = this.selectedNotes.size;
      selectionCount.classList.remove("hidden");

      // Show multi-selection tooltip for multiple selections
      if (this.selectedNotes.size > 1) {
        multiSelectionTooltip.classList.remove("hidden");
        // Auto-hide after 5 seconds
        clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = setTimeout(() => {
          multiSelectionTooltip.classList.add("hidden");
        }, 5000);
      } else {
        multiSelectionTooltip.classList.add("hidden");
      }
    } else {
      selectionCount.classList.add("hidden");
      multiSelectionTooltip.classList.add("hidden");
    }
  }

  deselectAll() {
    if (this.selectedNote) {
      const noteElement = document.getElementById(this.selectedNote);
      if (noteElement) {
        noteElement.classList.remove("selected", "multi-selected");
      }
    }

    // Clear all selected notes
    this.selectedNotes.forEach((noteId) => {
      const noteElement = document.getElementById(noteId);
      if (noteElement) {
        noteElement.classList.remove("selected", "multi-selected");
      }
    });

    this.selectedNote = null;
    this.selectedNotes.clear();
    this.updateSelectionCounter();
    this.hideContextMenu();

    // Remove selection box if exists
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
  }

  focusNoteContent(noteId) {
    const noteElement = document.getElementById(noteId);
    const textarea = noteElement?.querySelector(".note-text");
    if (textarea) {
      textarea.style.display = "block";
      const markdownDiv = noteElement.querySelector(".markdown-content");
      if (markdownDiv) markdownDiv.style.display = "none";
      textarea.focus();
      textarea.select();
    }
  }

  deleteNote(noteId) {
    const noteElement = document.getElementById(noteId);
    if (noteElement) {
      noteElement.remove();
    }
    this.notes.delete(noteId);
    if (this.selectedNote === noteId) {
      this.selectedNote = null;
    }
  }

  duplicateNote(noteId) {
    const originalNote = this.notes.get(noteId);
    if (!originalNote) return;

    const newNote = {
      ...originalNote,
      id: "note_" + this.nextId++,
      x: originalNote.x + 20,
      y: originalNote.y + 20,
      zIndex: this.getMaxZIndex() + 1,
      created: Date.now(),
      modified: Date.now(),
    };

    this.notes.set(newNote.id, newNote);
    this.renderNote(newNote);
    this.selectNote(newNote.id);
  }

  bringToFront(noteId) {
    const note = this.notes.get(noteId);
    if (note) {
      note.zIndex = this.getMaxZIndex() + 1;
      const noteElement = document.getElementById(noteId);
      if (noteElement) {
        noteElement.style.zIndex = note.zIndex;
      }
    }
  }

  sendToBack(noteId) {
    const note = this.notes.get(noteId);
    if (note) {
      note.zIndex = this.getMinZIndex() - 1;
      const noteElement = document.getElementById(noteId);
      if (noteElement) {
        noteElement.style.zIndex = note.zIndex;
      }
    }
  }

  getMaxZIndex() {
    let max = 0;
    this.notes.forEach((note) => {
      if (note.zIndex > max) max = note.zIndex;
    });
    return max;
  }

  getMinZIndex() {
    let min = Infinity;
    this.notes.forEach((note) => {
      if (note.zIndex < min) min = note.zIndex;
    });
    return min === Infinity ? 0 : min;
  }

  handleKeyDown(e) {
    // Don't interfere when typing in inputs
    if (
      e.target.matches("input, textarea, [contenteditable]") &&
      !e.target.classList.contains("note-text")
    ) {
      return;
    }

    // Handle markdown selection shortcuts
    if (e.target.closest(".markdown-content")) {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "a":
            e.preventDefault();
            this.selectAllTextInMarkdown(e.target.closest(".markdown-content"));
            return;
          case "c":
            // Let default copy behavior work for selected text
            return;
          case "e":
            e.preventDefault();
            const noteElement = e.target.closest(".note");
            const textarea = noteElement.querySelector(".note-text");
            const markdownDiv = e.target.closest(".markdown-content");
            this.switchToEditMode(noteElement, textarea, markdownDiv);
            return;
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        const markdownDiv = e.target.closest(".markdown-content");
        markdownDiv.classList.remove("selected");
        window.getSelection().removeAllRanges();
        return;
      }
    }

    if (this.selectedNote || this.selectedNotes.size > 0) {
      switch (e.key) {
        case "Delete":
        case "Backspace":
          if (!e.target.classList.contains("note-text")) {
            e.preventDefault();
            this.deleteSelectedNotes();
          }
          break;
        case "Escape":
          // If escaping from a text area, convert it to markdown and deselect
          if (e.target.classList.contains("note-text")) {
            e.target.blur();
            const note = this.notes.get(this.selectedNote);
            if (note && note.type === "text") {
              setTimeout(() => {
                this.renderMarkdown(e.target, note.content);
              }, 10);
            }
          }
          this.deselectAll();
          break;
        case "d":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.duplicateSelectedNotes();
          }
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.selectAllNotes();
          }
          break;
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight":
          if (!e.target.classList.contains("note-text")) {
            e.preventDefault();
            this.moveSelectedNotes(e.key, e.shiftKey ? 10 : 1);
          }
          break;
      }
    }
  }

  selectAllTextInMarkdown(markdownDiv) {
    markdownDiv.classList.add("selected");

    // Select all text content, excluding controls
    const range = document.createRange();
    const textContent = markdownDiv.cloneNode(true);

    // Remove controls from the clone
    const controls = textContent.querySelector(".markdown-controls");
    if (controls) {
      controls.remove();
    }

    range.selectNodeContents(markdownDiv);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  deleteSelectedNotes() {
    const notesToDelete =
      this.selectedNotes.size > 0
        ? Array.from(this.selectedNotes)
        : this.selectedNote
        ? [this.selectedNote]
        : [];

    notesToDelete.forEach((noteId) => {
      const noteElement = document.getElementById(noteId);
      if (noteElement) {
        noteElement.remove();
      }
      this.notes.delete(noteId);
    });

    this.selectedNote = null;
    this.selectedNotes.clear();

    // Trigger auto-save
    document.dispatchEvent(new CustomEvent("note-modified"));
  }

  duplicateSelectedNotes() {
    const notesToDuplicate =
      this.selectedNotes.size > 0
        ? Array.from(this.selectedNotes)
        : this.selectedNote
        ? [this.selectedNote]
        : [];

    const newlyCreatedNotes = [];

    notesToDuplicate.forEach((noteId) => {
      const originalNote = this.notes.get(noteId);
      if (!originalNote) return;

      const newNote = {
        ...originalNote,
        id: "note_" + this.nextId++,
        x: originalNote.x + 20,
        y: originalNote.y + 20,
        zIndex: this.getMaxZIndex() + 1,
        created: Date.now(),
        modified: Date.now(),
      };

      this.notes.set(newNote.id, newNote);
      this.renderNote(newNote);
      newlyCreatedNotes.push(newNote.id);
    });

    // Select the newly created notes
    this.deselectAll();
    newlyCreatedNotes.forEach((noteId) => {
      this.addToSelection(noteId);
    });

    // Trigger auto-save
    document.dispatchEvent(new CustomEvent("note-modified"));
  }

  selectAllNotes() {
    this.deselectAll();
    this.notes.forEach((note, noteId) => {
      this.addToSelection(noteId);
    });
  }

  moveSelectedNotes(direction, distance) {
    const notesToMove =
      this.selectedNotes.size > 0
        ? Array.from(this.selectedNotes)
        : this.selectedNote
        ? [this.selectedNote]
        : [];

    let deltaX = 0,
      deltaY = 0;

    switch (direction) {
      case "ArrowUp":
        deltaY = -distance;
        break;
      case "ArrowDown":
        deltaY = distance;
        break;
      case "ArrowLeft":
        deltaX = -distance;
        break;
      case "ArrowRight":
        deltaX = distance;
        break;
    }

    notesToMove.forEach((noteId) => {
      const note = this.notes.get(noteId);
      if (note) {
        note.x += deltaX;
        note.y += deltaY;
        note.modified = Date.now();
        this.updateNotePosition(note);
      }
    });

    // Trigger auto-save
    document.dispatchEvent(new CustomEvent("note-modified"));
  }

  async handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const imageData = await this.compressImage(file);
          const rect = document
            .getElementById("canvas")
            .getBoundingClientRect();
          const screenX = rect.left + rect.width / 2;
          const screenY = rect.top + rect.height / 2;
          const canvasPos = this.canvasManager.screenToCanvas(screenX, screenY);
          this.createImageNote(
            canvasPos.x - 150,
            canvasPos.y - 100,
            imageData,
            file
          );
        }
        break;
      } else if (item.type === "text/plain" && !this.selectedNote) {
        e.preventDefault();
        const text = await new Promise((resolve) => item.getAsString(resolve));
        const rect = document.getElementById("canvas").getBoundingClientRect();
        const screenX = rect.left + rect.width / 2;
        const screenY = rect.top + rect.height / 2;
        const canvasPos = this.canvasManager.screenToCanvas(screenX, screenY);
        const note = this.createTextNote(canvasPos.x - 150, canvasPos.y - 100);
        note.content = text;
        const noteElement = document.getElementById(note.id);
        const textarea = noteElement.querySelector(".note-text");
        if (textarea) {
          textarea.value = text;
          this.renderMarkdown(textarea, text);
        }
        break;
      }
    }
  }

  async compressImage(file) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
          try {
            // Calculate new dimensions
            let { width, height } = img;
            const maxSize = this.maxImageSize;

            if (width > maxSize || height > maxSize) {
              const ratio = Math.min(maxSize / width, maxSize / height);
              width *= ratio;
              height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedData = canvas.toDataURL(
              "image/jpeg",
              this.imageCompressionQuality
            );
            URL.revokeObjectURL(imageUrl); // Clean up
            resolve(compressedData);
          } catch (error) {
            URL.revokeObjectURL(imageUrl); // Clean up on error
            console.error("Image compression error:", error);
            reject(error);
          }
        };

        img.onerror = (error) => {
          URL.revokeObjectURL(imageUrl); // Clean up on error
          console.error("Image loading error:", error);
          reject(new Error("Failed to load image"));
        };

        const imageUrl = URL.createObjectURL(file);
        img.src = imageUrl;
      } catch (error) {
        console.error("Image processing error:", error);
        reject(error);
      }
    });
  }

  showContextMenu(e, noteId) {
    this.selectNote(noteId);
    const contextMenu = document.getElementById("context-menu");

    // Position the context menu
    let left = e.clientX;
    let top = e.clientY;

    // Prevent context menu from going off-screen
    const menuRect = contextMenu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (left + menuRect.width > windowWidth) {
      left = windowWidth - menuRect.width - 10;
    }
    if (top + menuRect.height > windowHeight) {
      top = windowHeight - menuRect.height - 10;
    }

    contextMenu.style.left = left + "px";
    contextMenu.style.top = top + "px";
    contextMenu.classList.remove("hidden");

    // Store the current note ID for context menu actions
    contextMenu.dataset.noteId = noteId;
  }

  hideContextMenu() {
    const contextMenu = document.getElementById("context-menu");
    contextMenu.classList.add("hidden");
  }

  handleContextMenuAction(action, noteId) {
    const selectedNotes =
      this.selectedNotes.size > 0
        ? Array.from(this.selectedNotes)
        : this.selectedNote
        ? [this.selectedNote]
        : [];

    switch (action) {
      case "duplicate":
        this.duplicateSelectedNotes();
        break;
      case "delete":
        this.deleteSelectedNotes();
        break;
      case "bring-front":
        selectedNotes.forEach((id) => this.bringToFront(id));
        break;
      case "send-back":
        selectedNotes.forEach((id) => this.sendToBack(id));
        break;
    }

    // Trigger auto-save
    document.dispatchEvent(new CustomEvent("note-modified"));
  }

  loadNotes(notesData) {
    // Clear existing notes
    this.notes.clear();
    document.getElementById("canvas-content").innerHTML = "";

    // Load new notes
    if (notesData && notesData.length > 0) {
      notesData.forEach((noteData) => {
        this.notes.set(noteData.id, noteData);
        this.renderNote(noteData);
      });

      // Update next ID
      const maxId = Math.max(
        ...notesData.map((n) => parseInt(n.id.split("_")[1]) || 0)
      );
      this.nextId = maxId + 1;
    }
  }

  exportNotes() {
    return Array.from(this.notes.values());
  }

  getNotesInViewport() {
    const viewport = this.canvasManager.getViewportBounds();
    return Array.from(this.notes.values()).filter((note) => {
      return !(
        note.x > viewport.right ||
        note.x + note.width < viewport.left ||
        note.y > viewport.bottom ||
        note.y + note.height < viewport.top
      );
    });
  }

  // Selection box methods for multi-select
  startSelection(e) {
    if (e.ctrlKey || e.metaKey) return; // Don't start selection with modifier keys

    this.isSelecting = true;
    const canvasPos = this.canvasManager.screenToCanvas(e.clientX, e.clientY);
    this.selectionStart = { x: canvasPos.x, y: canvasPos.y };
    this.selectionEnd = { x: canvasPos.x, y: canvasPos.y };

    // Clear existing selection unless Shift is held
    if (!e.shiftKey) {
      this.deselectAll();
    }

    // Create selection box element
    if (!this.selectionBox) {
      this.selectionBox = document.createElement("div");
      this.selectionBox.className = "selection-box";
      document.getElementById("canvas-content").appendChild(this.selectionBox);
    }

    this.updateSelectionBox();
    e.preventDefault();
  }

  updateSelection(e) {
    if (!this.isSelecting) return;

    const canvasPos = this.canvasManager.screenToCanvas(e.clientX, e.clientY);
    this.selectionEnd = { x: canvasPos.x, y: canvasPos.y };
    this.updateSelectionBox();
    e.preventDefault();
  }

  updateSelectionBox() {
    if (!this.selectionBox) return;

    const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
    const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);

    this.selectionBox.style.left = left + "px";
    this.selectionBox.style.top = top + "px";
    this.selectionBox.style.width = width + "px";
    this.selectionBox.style.height = height + "px";
  }

  endSelection() {
    if (!this.isSelecting) return;

    const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const right = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const bottom = Math.max(this.selectionStart.y, this.selectionEnd.y);

    // Find notes within selection area
    const selectedNotes = Array.from(this.notes.values()).filter((note) => {
      return (
        note.x < right &&
        note.x + note.width > left &&
        note.y < bottom &&
        note.y + note.height > top
      );
    });

    // Select found notes
    selectedNotes.forEach((note) => {
      this.addToSelection(note.id);
    });

    // Remove selection box
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }

    this.isSelecting = false;
  }
}

// Export for use in other modules
window.NotesManager = NotesManager;
