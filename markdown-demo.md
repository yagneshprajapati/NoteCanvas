# Enhanced Markdown Demo

This is a demonstration of the enhanced markdown functionality in NoteCanvas.

## Features

### Text Formatting

- **Bold text**
- _Italic text_
- `Inline code`
- ~~Strikethrough text~~

### Lists

1. Numbered list item 1
2. Numbered list item 2
   - Nested bullet point
   - Another nested item

### Code Blocks

```javascript
function createNote() {
  const note = {
    id: generateId(),
    content: "Hello World!",
    timestamp: Date.now(),
  };
  return note;
}
```

```python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # Output: 120
```

### Math Support

Inline math: $E = mc^2$

Display math:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### Tables

| Feature             | Status | Notes             |
| ------------------- | ------ | ----------------- |
| Copy functionality  | ✅     | Click copy button |
| Syntax highlighting | ✅     | Using Prism.js    |
| Math rendering      | ✅     | Using MathJax     |
| Selection mode      | ✅     | Click to select   |

### Blockquotes

> This is a blockquote with enhanced styling
>
> It supports multiple lines and has a nice visual presentation

### Links and Images

Visit [GitHub](https://github.com) for more code examples.

---

## Interactive Features

1. **Click to Select**: Click anywhere on this markdown content to select it
2. **Copy Content**: Use the copy button in the top-right corner
3. **Edit Mode**: Use the edit button or double-click to switch to edit mode
4. **Text Selection**: Use the select button to enable text selection
5. **Keyboard Shortcuts**:
   - `Ctrl+A`: Select all text
   - `Ctrl+C`: Copy selected text
   - `Ctrl+E`: Switch to edit mode
   - `Esc`: Deselect

## Code Examples

### HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Sample Page</title>
  </head>
  <body>
    <h1>Hello World!</h1>
  </body>
</html>
```

### CSS

```css
.markdown-content {
  font-family: "Inter", sans-serif;
  line-height: 1.6;
  color: #f3f4f6;
}

.code-block {
  background: #111827;
  border-radius: 0.5rem;
  padding: 1rem;
}
```

Try copying any of these code blocks using the copy button!
