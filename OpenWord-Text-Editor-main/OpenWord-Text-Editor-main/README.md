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

1️⃣ Single main component (OpenWord)

Reason: Keeps everything in one place for a small codebase.

Pros: Easy to follow top-to-bottom flow.

Cons: Large file (~1200 lines); could be split into smaller components (Toolbar, Page, HeaderFooterEditor) for maintainability.

2️⃣ Use of contentEditable + document.execCommand

Pros:

Quick way to get a full rich-text editor.

Browser handles caret movement, selection, and edge cases.

Less code than building an editor from scratch.

Cons:

execCommand is deprecated (but still widely supported).

Generated HTML can be messy and inconsistent across browsers.

Hard to enforce a structured document model.

3️⃣ DOM-driven editing with periodic React sync

How it works: DOM’s innerHTML is the main source of truth while typing; React state (pages) is synced periodically.

Pros: Better performance (avoids state updates on every keystroke).

Cons: Two sources of truth to keep in sync; requires careful DOM traversal (updatePages, splitOverflow).

4️⃣ Auto-pagination by measuring height

How it works: Uses PAGE_WIDTH, PAGE_HEIGHT, CONTENT_MAX_HEIGHT; overflow detected via scrollHeight.

Pros: Visually intuitive, simple to implement.

Cons: Sensitive to fonts/layout; not a full typesetting engine (like Word/LaTeX).

5️⃣ Shared header/footer model

How it works: Each page stores header/footer, but edits apply to all pages.

Pros: Easy to implement; flexible for future per-page customization.

Cons: Limited per-page customization in current version.

6️⃣ Vite + Tailwind

Vite Pros: Fast dev experience, minimal config.

Tailwind Pros: Consistent styling, reduces switching between JSX and CSS.

7️⃣ LocalStorage for saving documents

How it works: Saves pages and formatting to localStorage for persistence.

Pros:

Quick and easy storage for small documents.

No backend needed; works offline.

Automatic restore on app reload.

Cons:

Limited storage (~5–10MB).

Only accessible in the same browser/device.

Not suitable for collaborative editing or large files.

Risk of data loss if browser clears storage.
