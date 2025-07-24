# NoteCanvas - Infinite Note Taking App

A sophisticated, Figma-like canvas for taking notes with text and images. Features include markdown support, encryption, and intelligent organization.

## ✨ Features

### 🎨 Canvas Interface

- **Infinite Canvas**: Zoom and pan like Figma
- **Grid Background**: Customizable grid for better alignment
- **Smooth Interactions**: Responsive dragging, resizing, and selection
- **Viewport Optimization**: Only renders visible notes for performance

### 📝 Text Notes

- **Markdown Support**: Rich text formatting with live preview
- **Resizable**: Drag handles on all sides and corners
- **Auto-save**: Changes saved automatically
- **Smart Editing**: Click to edit, blur to render markdown

### 🖼️ Image Notes

- **Drag & Drop**: Direct paste support from clipboard
- **Auto-compression**: Images compressed to optimal size
- **Multiple Formats**: Supports all common image formats
- **Resizable**: Maintain aspect ratio while resizing

### 🔐 Security

- **Client-side Encryption**: AES-256 encryption with PBKDF2
- **Password Protection**: Secure your notes with a password
- **Encrypted Export/Import**: Share notes securely
- **No Server Dependency**: Everything stored locally

### ⚡ Performance

- **IndexedDB Storage**: Fast, persistent browser storage
- **Memory Efficient**: Optimized for large numbers of notes
- **Offline Support**: Service worker for offline functionality
- **Smart Rendering**: Only updates what's necessary

### 🎯 User Experience

- **Keyboard Shortcuts**: Figma-like shortcuts for power users
- **Context Menus**: Right-click for quick actions
- **Mobile Friendly**: Touch gestures and responsive design
- **Accessibility**: Screen reader support and keyboard navigation

## 🚀 Quick Start

1. **Open `index.html`** in your browser
2. **Start Creating**:
   - Press `T` to add a text note
   - Press `I` to add an image
   - Or use the toolbar buttons
3. **Navigate**:
   - Drag the canvas to pan
   - Scroll to zoom
   - Select notes to move/resize
4. **Save**: Press `Ctrl+S` or notes auto-save every 30 seconds

## ⌨️ Keyboard Shortcuts

### Global Shortcuts

- `T` - Add text note
- `I` - Add image note
- `Ctrl+S` - Save notes
- `Ctrl+O` - Import notes
- `Ctrl+Shift+E` - Export notes
- `Ctrl+,` - Open settings

### Canvas Navigation

- `Ctrl++` - Zoom in
- `Ctrl+-` - Zoom out
- `Ctrl+0` - Reset zoom to 100%
- `Arrow Keys` - Pan canvas

### Note Management

- `Delete` - Delete selected note
- `Ctrl+D` - Duplicate selected note
- `Escape` - Deselect all notes

## 🛠️ Technical Details

### Architecture

- **Modular Design**: Separated concerns across multiple classes
- **Event-driven**: Efficient communication between components
- **Memory Management**: Proper cleanup and garbage collection
- **Error Handling**: Graceful degradation and user feedback

### Technologies Used

- **HTML5**: Semantic structure and modern APIs
- **CSS3**: Tailwind CSS for styling and animations
- **JavaScript ES6+**: Modern JavaScript features
- **IndexedDB**: Client-side database storage
- **Web Crypto API**: Secure encryption implementation
- **Service Workers**: Offline functionality

### Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🔧 Configuration

### Settings Panel

Access via toolbar or `Ctrl+,`:

- **Grid Size**: Adjust background grid spacing
- **Auto-save Interval**: Change how often notes are saved
- **Grid Visibility**: Show/hide the background grid

### Security Settings

- Set a master password to encrypt all notes
- Export with custom password protection
- Import encrypted note files

## 📱 Mobile Support

- **Touch Gestures**: Pinch to zoom, drag to pan
- **Double-tap**: Add new text note
- **Long Press**: Context menu access
- **Responsive Design**: Adapts to screen size

## 🔒 Privacy & Security

- **Local Storage Only**: No data sent to servers
- **End-to-end Encryption**: Your password never leaves your device
- **Open Source**: Transparent implementation
- **No Tracking**: No analytics or user tracking

## 🚨 Important Notes

### Data Management

- **Backup Regularly**: Export your notes periodically
- **Remember Passwords**: No password recovery mechanism
- **Import Overwrites**: Importing replaces all current notes

### Performance Tips

- **Large Images**: Will be auto-compressed for performance
- **Many Notes**: Use zoom and pan to navigate efficiently
- **Auto-save**: Disable if experiencing performance issues

## 🎯 Use Cases

- **Personal Knowledge Base**: Organize thoughts and ideas
- **Project Planning**: Visual project organization
- **Research Notes**: Collect and organize research materials
- **Creative Brainstorming**: Mind mapping and idea generation
- **Meeting Notes**: Quick note-taking with visual elements

## 🛣️ Future Enhancements

- **Collaboration**: Real-time collaborative editing
- **Templates**: Pre-designed note templates
- **Search**: Full-text search across all notes
- **Tagging**: Organizational tags and filtering
- **Sync**: Cloud synchronization options

## 🐛 Troubleshooting

### Common Issues

1. **Notes not saving**: Check browser storage permissions
2. **Import fails**: Verify password and file format
3. **Performance issues**: Try clearing browser cache
4. **Mobile gestures**: Ensure touch events are enabled

### Debug Console

Open browser dev tools and use:

```javascript
showStats(); // Display note statistics
fitToView(); // Fit all notes in viewport
clearAll(); // Clear all notes (with confirmation)
showShortcuts(); // List all keyboard shortcuts
```

## 📄 License

This project is open source and available under the MIT License.

---

**Made with ❤️ for note-taking enthusiasts**
