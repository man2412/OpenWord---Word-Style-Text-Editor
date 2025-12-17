# OpenWord - Word-style Text Editor

A frontend-only Microsoft Word-style editor built with React and Tailwind CSS.

## Features

### Text Formatting
- **Bold, Italic, Underline** – Format your text with basic styling (via toolbar or shortcuts)
- **Font Color & Highlight** – Choose from 12 colors for text and highlighting
- **Font Family** – 29+ fonts including Arial, Verdana, Calibri, and Google Fonts like Nunito, Roboto, Montserrat, etc.
- **Text Styles** – Heading 1, Heading 2, Heading 3, Title, Subtitle, Normal
- **Text Alignment** – Left, Center, Right alignment
- **Lists with nesting** – Bulleted and Numbered lists, with Tab / Shift+Tab to indent/outdent items (nested lists) similar to Google Docs

### Pagination & Layout
- **A4-style Pages** – Each page is rendered at an A4-like size and stacked vertically for a document-like feel
- **Automatic Overflow to New Pages** – As you type and fill a page, overflowing blocks are automatically moved to the next page, so writing feels continuous
- **Manual Page Breaks** – Insert a new page at the current cursor position with `Ctrl/Cmd + Enter` or the **Page Break** button
- **Shared Header & Footer** – Edit header and footer once and it appears on all pages
- **Page Numbers** – Auto-incremented page numbers on each page

### Advanced Features
- **Floating Toolbar** – Quick access to Bold, Italic, Underline when text is selected
- **Cut, Copy, Paste** – Standard text operations with browser support
- **Auto-save** – Document automatically saves to localStorage every second

- **Reset Document** – One-click button to clear all content, headers, and footers and start fresh
- **Keyboard Shortcuts** – Quick access to common formatting and pagination actions

## Keyboard Shortcuts

- `Tab / Shift+Tab` – Indent / Outdent list items
- `Ctrl/Cmd + B` – Bold
- `Ctrl/Cmd + I` – Italic
- `Ctrl/Cmd + U` – Underline
- `Ctrl/Cmd + L` – Align Left
- `Ctrl/Cmd + E` – Align Center
- `Ctrl/Cmd + R` – Align Right
- `Ctrl/Cmd + S` – Save Document
- `Ctrl + Enter` – Insert Page Break at cursor

## Installation & Running

```bash
# Install dependencies
npm install

# Run development server
npm run dev

#
## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **localStorage** - Document persistence

## Storage

Documents are stored in browser localStorage under the key `openword_doc`. The data structure is designed to be easily exportable to a backend service via API, gRPC, or WebSockets.

### Document Structure

```json
{
  "pages": [
    {
      "id": 1,
      "content": "<p>Page content HTML</p>",
      "header": "<p>Header content</p>",
      "footer": "<p>Footer content</p>"
    }
  ],
  "lastModified": "2025-12-09T10:30:00.000Z"
}
```

## License

This project uses only open-source libraries with permissive licenses (MIT, Apache 2.0):
- React (MIT)
- Vite (MIT)
- Tailwind CSS (MIT)
- Lucide React (ISC)

## Browser Compatibility

Works best in modern browsers that support:
- `contentEditable` API
- `document.execCommand()` for text formatting
- localStorage
- ES6+ JavaScript features

All features are implemented and tested. The codebase demonstrates:
- ✅ React hooks (useState, useEffect, useRef, useCallback)
- ✅ Browser API integration (contentEditable, execCommand, Selection API)
- ✅ State management patterns
- ✅ Event handling (synthetic + native)
- ✅ Performance optimization (debouncing, conditional rendering)
- ✅ Data persistence (localStorage with backend-ready JSON format)

### 8. Architectural Choices & Rationale

- **Single main component (`OpenWord`)**
  - Keeps everything in one place for a small codebase.
  - Easy to reason about flow from top to bottom.
  - Trade‑off: `App.jsx` is large (~1200 lines) and could be split into smaller components (Toolbar, Page, HeaderFooterEditor, etc.) for long‑term maintainability.

- **Use of `contentEditable` + `document.execCommand`**
  - **Pros**:
    - Fast way to get a full rich‑text editor.
    - Browser handles caret movement, selection, and many edge cases.
    - Less code than building a full editor from scratch.
  - **Cons**:
    - `execCommand` is officially deprecated (but widely supported).
    - Generated HTML can be messy and vary across browsers.
    - Harder to enforce a strict, structured document model.

- **DOM‑driven editing with periodic React sync**
  - The DOM’s `innerHTML` is treated as the source of truth during typing.
  - React state (`pages`) is periodically updated from the DOM.
  - **Pros**:
    - Better performance for a word processor (avoids state updates on each keystroke).
  - **Cons**:
    - Two sources of truth to keep in sync (DOM and React state).
    - Requires careful DOM traversal and sync logic (`splitOverflow`, `updatePages`).

- **Auto‑pagination by measuring height**
  - Uses `PAGE_WIDTH`, `PAGE_HEIGHT`, and `CONTENT_MAX_HEIGHT` to simulate A4 pages at 96 DPI.
  - Overflow detection is based on `scrollHeight` vs. max.
  - Visually intuitive and relatively straightforward, but:
    - Sensitive to font choices and layout changes.
    - Does not fully simulate a typesetting engine (like Word/LaTeX), but is good enough for web UI.

- **Shared header/footer model**
  - Every page stores `header` and `footer`, but editing applies to all pages.
  - This makes it easy to add per‑page customization in the future if needed.

- **Vite + Tailwind choice**
  - Vite:
    - Provides a fast, modern dev experience with minimal config.
  - Tailwind:
    - Encourages consistent design via utility classes.
    - Reduces context‑switching between JSX and CSS files.

---
