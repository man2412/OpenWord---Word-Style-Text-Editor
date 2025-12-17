import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Palette,
  FileDown,
  Type,
  Trash2,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";

const loadFonts = () => {
  const link = document.createElement("link");
  link.href =
    "https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Raleway:wght@400;700&family=PT+Sans:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Ubuntu:wght@400;700&family=Poppins:wght@400;700&family=Noto+Sans:wght@400;700&family=Quicksand:wght@400;700&family=Crimson+Text:wght@400;700&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
};

if (typeof window !== "undefined") {
  loadFonts();
}

const FONTS = [
  "Arial",
  "Verdana",
  "Calibri",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Trebuchet MS",
  "Comic Sans MS",
  "Impact",
  "Tahoma",
  "Palatino Linotype",
  "Garamond",
  "Bookman Old Style",
  "Helvetica",
  "Nunito",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "PT Sans",
  "Merriweather",
  "Playfair Display",
  "Ubuntu",
  "Poppins",
  "Noto Sans",
  "Quicksand",
  "Crimson Text",
];

// 12 predefined colors for text color and highlighting
// Black, Red, Green, Blue, Yellow, Magenta, Cyan, Orange, Purple, Dark Green, Gray, Pink
const COLORS = [
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#008000",
  "#808080",
  "#FFC0CB",
];

// A4 paper size dimensions at 96 DPI (web standard)
// A4 = 210mm × 297mm = 8.27in × 11.69in
const PAGE_WIDTH = 794; // 8.27 inches at 96 DPI (210mm)
const PAGE_HEIGHT = 1123; // 11.69 inches at 96 DPI (297mm)
const CONTENT_MAX_HEIGHT = 950; // Max content height before overflow (excluding header/footer/padding)

export default function OpenWord() {
  // Document pages array - each page has: id, content (HTML), header (HTML), footer (HTML)
  const [pages, setPages] = useState([
    { id: 1, content: "", header: "", footer: "" },
  ]);

  // Current page index for editing (which page the cursor is in)
  const [currentPage, setCurrentPage] = useState(0);

  // Refs for each page's editor
  const pageRefs = useRef([]);

  // UI state for pickers & current formatting
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState("#000000");
  const [currentHighlightColor, setCurrentHighlightColor] =
    useState("#ffff00");
  const [currentFontFamily, setCurrentFontFamily] = useState("Arial");
  const [selectedFormat, setSelectedFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    color: "#000000",
    highlight: "transparent",
    font: "Arial",
    fontSize: "16px",
    align: "left",
    style: "normal",
  });

  // Floating toolbar position/visibility when text is selected
  const [showFloatingBar, setShowFloatingBar] = useState(false);
  const [floatingBarPos, setFloatingBarPos] = useState({ x: 0, y: 0 });

  const [headerFooterMode, setHeaderFooterMode] = useState(null);

  const editorRef = useRef(null); // Main contentEditable div reference
  const colorPickerRef = useRef(null); // For detecting clicks outside color picker
  const highlightPickerRef = useRef(null); // For detecting clicks outside highlight picker
  const fontPickerRef = useRef(null); // For detecting clicks outside font picker
  const lastSelectionRange = useRef(null); // Remember last caret/selection inside editor

  // Helper: remove empty trailing pages (no body content),
  // always keeping at least the first page.
  const trimEmptyTrailingPages = useCallback((pagesArray) => {
    if (!pagesArray || pagesArray.length === 0) return [{ id: 1, content: "", header: "", footer: "" }];

    let end = pagesArray.length - 1;
    while (end > 0) {
      const p = pagesArray[end];
      // Consider a page "empty" if its body content has no visible text
      const raw = p.content || "";
      const cleaned = raw
        .replace(/&nbsp;/gi, "")
        .replace(/<br\s*\/?>/gi, "")
        .replace(/<[^>]*>/g, "")
        .trim();
      const isEmpty = cleaned.length === 0;
      if (!isEmpty) break;
      end -= 1;
    }

    const trimmed = pagesArray.slice(0, end + 1).map((p, i) => ({
      ...p,
      id: i + 1,
    }));
    return trimmed.length > 0
      ? trimmed
      : [{ id: 1, content: "", header: "", footer: "" }];
  }, []);

  // Track what content was last loaded to avoid reloading while typing
  const lastLoadedPage = useRef(-1);
  const lastLoadedMode = useRef(null);
  useEffect(() => {
    const saved = localStorage.getItem("openword_doc");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Restore pages array, or default to single empty page if corrupted
        const restored =
          data.pages || [{ id: 1, content: "", header: "", footer: "" }];
        setPages(trimEmptyTrailingPages(restored));
      } catch (e) {
        console.error("Failed to load document");
      }
    }
  }, [trimEmptyTrailingPages]); // Run once on mount (trim empty pages on load)

  const saveDocument = useCallback(() => {
    const docData = {
      pages: trimEmptyTrailingPages(pages), // All pages with content, headers, footers (trim empty tails)
      lastModified: new Date().toISOString(), // Timestamp for tracking
    };
    localStorage.setItem("openword_doc", JSON.stringify(docData));
  }, [pages, trimEmptyTrailingPages]);

  useEffect(() => {
    const timer = setTimeout(saveDocument, 1000);
    return () => clearTimeout(timer); // Cleanup: cancel timer if pages change again
  }, [pages, saveDocument]);

  // ============================================================================
  useEffect(() => {
    if (headerFooterMode && editorRef.current) {
      // Load header/footer for editing
      if (lastLoadedMode.current !== headerFooterMode) {
        const content =
          headerFooterMode === "header"
            ? pages[0]?.header || ""
            : pages[0]?.footer || "";
        editorRef.current.innerHTML = content;
        lastLoadedMode.current = headerFooterMode;
      }
    } else if (!headerFooterMode) {
      // Load content for all pages
      pages.forEach((page, index) => {
        const editor = pageRefs.current[index];
        if (editor && editor.innerHTML === "") {
          editor.innerHTML = page.content || "";
          if (!page.content) {
            editor.style.fontFamily = "Arial, sans-serif";
          }
        }
      });
      lastLoadedMode.current = null;
    }
  }, [pages, headerFooterMode]); // Runs when pages or mode change

  // ============================================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target)
      ) {
        setShowColorPicker(false);
      }
      if (
        highlightPickerRef.current &&
        !highlightPickerRef.current.contains(event.target)
      ) {
        setShowHighlightPicker(false);
      }
      if (
        fontPickerRef.current &&
        !fontPickerRef.current.contains(event.target)
      ) {
        setShowFontPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================================================================
  // FLOATING TOOLBAR - Shows on text selection
  // ============================================================================
  // Listens to browser's selection changes and displays floating toolbar above selected text
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      // Check if user has selected text (not just cursor position)
      if (selection && selection.toString().length > 0) {
        const range = selection.getRangeAt(0); // Get first selection range
        // Only react to selections that are inside our editors (page content or header/footer)
        const inHeaderFooter =
          editorRef.current && editorRef.current.contains(range.commonAncestorContainer);
        const inPageEditor = pageRefs.current.some(
          (ed) => ed && ed.contains(range.commonAncestorContainer)
        );

        if (inHeaderFooter || inPageEditor) {
          // Remember this range so toolbar buttons (like Page Break) can use it
          lastSelectionRange.current = range.cloneRange();

          const rect = range.getBoundingClientRect(); // Get position on screen
          // Position floating bar 50px above selection
          setFloatingBarPos({ x: rect.left, y: rect.top - 50 });
          setShowFloatingBar(true);
        } else {
          setShowFloatingBar(false);
        }
      } else {
        setShowFloatingBar(false); // Hide when no selection
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const code = e.code;

      // Tab / Shift+Tab inside a list => indent/outdent (for nested lists)
      if (key === "Tab") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const node = sel.anchorNode;
          const isInList = (n) => {
            let cur = n;
            while (cur) {
              if (
                cur.nodeName === "LI" ||
                cur.nodeName === "UL" ||
                cur.nodeName === "OL"
              ) {
                return true;
              }
              cur = cur.parentNode;
            }
            return false;
          };
          if (isInList(node)) {
            e.preventDefault();
            document.execCommand(e.shiftKey ? "outdent" : "indent", false, null);
            updatePages(); // Save changes to state for current page
            return;
          }
        }
      }

      // Auto page-break when pressing Enter near bottom of current page (no modifiers)
      if (
        key === "Enter" &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !headerFooterMode
      ) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const node = sel.anchorNode;
          let foundIndex = null;
          pageRefs.current.forEach((ed, idx) => {
            if (ed && ed.contains(node)) {
              foundIndex = idx;
            }
          });
          if (foundIndex !== null) {
            const ed = pageRefs.current[foundIndex];
            if (ed && range) {
              const caretRect = range.getBoundingClientRect();
              const edRect = ed.getBoundingClientRect();
              const overflow = ed.scrollHeight - ed.clientHeight > 4;
              const tallEnough = ed.scrollHeight > CONTENT_MAX_HEIGHT - 24;
              const nearBottom =
                caretRect && caretRect.bottom >= edRect.bottom - 32;
              if ((nearBottom && tallEnough) || overflow) {
                e.preventDefault();
                insertPageBreak(foundIndex);
                return;
              }
            }
          }
        }
      }

      // Check for Ctrl (Windows/Linux) or Command (Mac) key
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault(); // Stop browser default (bookmark)
            applyFormat("bold"); // Toggle bold formatting
            break;
          case "i":
            e.preventDefault();
            applyFormat("italic"); // Toggle italic formatting
            break;
          case "u":
            e.preventDefault();
            applyFormat("underline"); // Toggle underline formatting
            break;
          case "e":
            e.preventDefault();
            applyAlign("center"); // Center align text
            break;
          case "l":
            e.preventDefault();
            applyAlign("left"); // Left align text
            break;
          case "r":
            e.preventDefault();
            applyAlign("right"); // Right align text
            break;
          case "s":
            e.preventDefault(); // Stop browser save dialog
            saveDocument(); // Manually trigger save
            break;
        }
      }

      // Ctrl+Enter: Insert page break (create new page)
      if (key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        insertPageBreak();
      }

      // Ctrl+Shift+7: Numbered list
      if (
        (code === "Digit7" || key === "7") &&
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey
      ) {
        e.preventDefault();
        insertList(true);
      }

      // Ctrl+Shift+8: Bullet list
      if (
        (code === "Digit8" || key === "8") &&
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey
      ) {
        e.preventDefault();
        insertList(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [saveDocument]);

  // ============================================================================
  // FORMATTING FUNCTIONS
  // ============================================================================

  // BUTTON: Bold, Italic, Underline
  // Uses browser's built-in execCommand to apply basic formatting
  // Wraps selected text in <b>, <i>, or <u> tags
  const applyFormat = (format) => {
    document.execCommand(format, false, null);
    updatePages(); // Save changes to state for current page
  };

  // BUTTON: Text Color (Type icon)
  // Changes the color of selected text using foreColor command
  // Creates <font color="..."> or <span style="color: ...">
  const applyColor = () => {
    document.execCommand("foreColor", false, currentTextColor);
    setShowColorPicker(false); // Close the color picker dropdown
    updatePages(); // Save changes to state for current page
  };

  // BUTTON: Highlight Color (Palette icon)
  // Adds background color to selected text like a highlighter
  // Creates <span style="background-color: ...">
  const applyHighlight = () => {
    document.execCommand("hiliteColor", false, currentHighlightColor);
    setShowHighlightPicker(false); // Close the highlight picker dropdown
    updatePages(); // Save changes to state for current page
  };

  // BUTTON: Font Picker Dropdown
  // Changes font family of selected text by wrapping in <span> with fontFamily style.
  // Falls back to applying the font to the active editor when no text is selected.
  const applyFont = (font) => {
    const fontFamily = font.includes(" ") ? `"${font}"` : font;
    const selection = window.getSelection();
    const targetEditor = headerFooterMode
      ? editorRef.current
      : pageRefs.current[currentPage];

    if (!targetEditor) return;

    if (selection && selection.rangeCount > 0 && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontFamily = fontFamily;

      try {
        // Try to wrap selection in a <span> for clean inline styling
        range.surroundContents(span);
      } catch (e) {
        // If it spans multiple nodes, extract and wrap
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }

      selection.removeAllRanges();
    } else {
      // No selection: apply to the entire active editor so new text uses this font
      targetEditor.style.fontFamily = fontFamily;
    }

    setCurrentFontFamily(font);
    setSelectedFormat((prev) => ({ ...prev, font }));
    setShowFontPicker(false);
    updatePages(currentPage); // Persist the change on the active page
  };

  // BUTTONS: Align Left, Align Center, Align Right
  // Changes paragraph/block alignment using justify commands
  const applyAlign = (align) => {
    const cmd =
      align === "left"
        ? "justifyLeft"
        : align === "center"
        ? "justifyCenter"
        : "justifyRight";
    document.execCommand(cmd, false, null);
    updatePages(); // Save changes to state for current page
  };

  // DROPDOWN: Style Selector (Normal, Heading 1-3, Title, Subtitle)
  // Applies predefined text styles with specific font sizes and weights
  // Uses a workaround because execCommand('fontSize') creates deprecated <font> tags
  const applyStyle = (style) => {
    // Define size mappings for each style
    const sizes = {
      heading1: "32px", // Largest heading
      heading2: "24px", // Medium heading
      heading3: "19px", // Smaller heading
      title: "28px", // Document title
      subtitle: "18px", // Subtitle text
      normal: "16px", // Default body text
    };

    // Workaround: Use fontSize command with arbitrary value '7'
    document.execCommand("fontSize", false, "7");
    // Find all <font> elements that were just created
    const fontElements = document.getElementsByTagName("font");
    for (let element of fontElements) {
      if (element.size === "7") {
        element.removeAttribute("size"); // Remove deprecated size attribute
        element.style.fontSize = sizes[style]; // Apply CSS font size
        // Headings and titles should be bold
        if (style.startsWith("heading") || style === "title") {
          element.style.fontWeight = "bold";
        }
      }
    }
    updatePages(); // Save changes to state for current page
  };

  // BUTTONS: Bullet List, Numbered List
  // Creates <ul> (unordered) or <ol> (ordered) lists with <li> items
  // Browser automatically handles list nesting when user presses Tab
  const insertList = (ordered) => {
    // Ensure editor has focus before executing command
    const targetEditor = headerFooterMode
      ? editorRef.current
      : pageRefs.current[currentPage];
    if (targetEditor) {
      targetEditor.focus();

      // Small delay to ensure focus is registered
      setTimeout(() => {
        document.execCommand(
          ordered ? "insertOrderedList" : "insertUnorderedList",
          false,
          null
        );
        updatePages(); // Save changes to state for current page
      }, 10);
    }
  };

  // BUTTON / SHORTCUT: Page Break (Ctrl+Enter)
  // Splits content at cursor position:
  // - Content before cursor stays on current page
  // - Content after cursor moves to new page
  const insertPageBreak = (targetIndex = currentPage) => {
    let contentAfterBreak = "";
    let contentBeforeBreak = null;

    // Try to split content if we have a valid selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const editor = pageRefs.current[targetIndex];

      // Check if selection is actually inside the target editor
      if (editor && editor.contains(range.commonAncestorContainer)) {
        try {
          // Create a range from cursor to end of this editor
          const splitRange = document.createRange();
          splitRange.setStart(range.endContainer, range.endOffset);
          splitRange.setEndAfter(editor.lastChild || editor);

          // Extract contents (removes from DOM)
          const fragment = splitRange.extractContents();

          // Convert fragment to HTML string
          const tempDiv = document.createElement("div");
          tempDiv.appendChild(fragment);
          contentAfterBreak = tempDiv.innerHTML;

          // Get the remaining content for the current page
          contentBeforeBreak = editor.innerHTML;
        } catch (e) {
          console.error("Failed to split content:", e);
        }
      }
    }

    setPages((prev) => {
      const newPages = [...prev];

      // Update current page if we successfully split
      if (contentBeforeBreak !== null) {
        newPages[targetIndex] = {
          ...newPages[targetIndex],
          content: contentBeforeBreak,
        };
      }

      const newPage = {
        id: prev.length + 1,
        content: contentAfterBreak,
        header: prev[0]?.header || "",
        footer: prev[0]?.footer || "",
      };

      newPages.splice(targetIndex + 1, 0, newPage);
      return newPages.map((p, i) => ({ ...p, id: i + 1 }));
    });

    // Focus on new page after a brief delay
    setTimeout(() => {
      const nextEditor = pageRefs.current[targetIndex + 1];
      if (nextEditor) {
        nextEditor.focus();
      }
    }, 100);
  };

  // CORE FUNCTION: Save editor content to pages state
  // Called after every formatting change or user input
  // Routes content to correct field based on current editing mode
  const updatePages = (pageIndex) => {
    const effectiveIndex =
      pageIndex !== undefined && pageIndex !== null ? pageIndex : currentPage;

    const editor = headerFooterMode
      ? editorRef.current
      : pageRefs.current[effectiveIndex];
    if (!editor) return;

    let newPages = [...pages];
    // Check which mode we're in and save to appropriate field
    if (headerFooterMode === 'header') {
      // Update header on ALL pages (shared header)
      const headerContent = editor.innerHTML;
      newPages.forEach((page) => {
        page.header = headerContent;
      });
    } else if (headerFooterMode === 'footer') {
      // Update footer on ALL pages (shared footer)
      const footerContent = editor.innerHTML;
      newPages.forEach((page) => {
        page.footer = footerContent;
      });
    } else {
      // Normal mode: save to specific page content
      newPages[effectiveIndex].content = editor.innerHTML;
    }
    newPages = trimEmptyTrailingPages(newPages);
    setPages(newPages); // Triggers auto-save via useEffect

    // After updating content, check for overflow and split to next pages as needed
    if (!headerFooterMode) {
      setTimeout(() => splitOverflow(effectiveIndex), 0);
    }
  };

  // Auto-pagination: if a page overflows, move blocks to the next page
  const splitOverflow = (pageIndex, depth = 0) => {
    // Safety guard to prevent runaway recursion
    if (depth > 20) return;

    const editor = pageRefs.current[pageIndex];
    if (!editor) return;

    const isOverflowing = () => editor.scrollHeight > CONTENT_MAX_HEIGHT + 4; // small tolerance

    if (!isOverflowing()) return;

    // Ensure there is a next page to receive overflow
    if (!pageRefs.current[pageIndex + 1]) {
      ensureNextPage(pageIndex);
      // Wait for React to render next page, then continue splitting
      setTimeout(() => splitOverflow(pageIndex, depth + 1), 30);
      return;
    }

    const nextEditor = pageRefs.current[pageIndex + 1];
    if (!nextEditor) return;

    // Move the last meaningful node (or split a large text node) to the next page
    const moveOneBlock = () => {
      let node = editor.lastChild;
      // Skip empty text nodes/spacers
      while (node && node.nodeType === 3 && node.textContent.trim() === "") {
        node = node.previousSibling;
      }
      if (!node) return false;

      // If the page is essentially a single large text node, split it
      if (node.nodeType === 3 && editor.childNodes.length === 1) {
        const fullText = node.textContent || "";
        if (fullText.length < 40) {
          // Too short to safely split; move whole node
          nextEditor.insertBefore(node, nextEditor.firstChild);
          return true;
        }

        const splitIndex = Math.floor(fullText.length * 0.6); // keep ~60% on current page
        const beforeText = fullText.slice(0, splitIndex);
        const afterText = fullText.slice(splitIndex);

        node.textContent = beforeText;
        const newTextNode = document.createTextNode(afterText);
        nextEditor.insertBefore(newTextNode, nextEditor.firstChild);
        return true;
      }

      // Default: move the last block/node to next page
      nextEditor.insertBefore(node, nextEditor.firstChild);
      return true;
    };

    let moved = false;
    while (isOverflowing()) {
      const ok = moveOneBlock();
      if (!ok) break;
      moved = true;
    }

    // Sync pages state from DOM after moving
    if (moved) {
      setPages((prev) => {
        const updated = prev.map((p, idx) => {
          const ed = pageRefs.current[idx];
          return {
            ...p,
            content: ed ? ed.innerHTML : p.content,
            header: prev[0]?.header || "",
            footer: prev[0]?.footer || "",
            id: idx + 1,
          };
        });
        return trimEmptyTrailingPages(updated);
      });
    }

    // If next page also overflows, continue splitting downwards
    setTimeout(() => splitOverflow(pageIndex + 1, depth + 1), 0);
  };

  // BUTTON: Delete Page (Trash icon)
  // Removes current page from document
  // Prevents deletion if it's the only page (must have at least 1)
  const deletePage = (index) => {
    if (pages.length > 1) {
      const newPages = pages.filter((_, i) => i !== index); // Remove page at index
      setPages(newPages.map((p, i) => ({ ...p, id: i + 1 }))); // Renumber remaining pages
      // If we deleted the last page, move to the new last page
      if (currentPage >= newPages.length) {
        setCurrentPage(newPages.length - 1);
      }
    }
    // If only 1 page, do nothing (document must have at least one page)
  };

  // BUTTON: Export (FileDown icon)
  // Saves document to user's computer as a JSON file
  // Can be used for backups or transferring to another browser/backend
  // (Export button removed as per requirements)

  // BUTTON: Import (FileUp icon)
  // Loads a previously exported JSON document
  // Replaces current document entirely (no merge)
  const importDocument = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          setPages(
            data.pages || [{ id: 1, content: "", header: "", footer: "" }]
          );
          setCurrentPage(0); // Reset to first page
          // Reset tracking refs so content loads after import
          lastLoadedPage.current = -1;
          lastLoadedMode.current = null;
        } catch (err) {
          alert("Failed to import document"); // Invalid JSON or wrong format
        }
      };
      reader.readAsText(file); // Read file as text (JSON string)
    }
  };

  // BUTTON: Reset Document
  // Clears all pages, header, footer and localStorage
  const resetDocument = () => {
    const confirmed = window.confirm(
      'This will clear the entire document (all pages, header, footer). Continue?'
    );
    if (!confirmed) return;

    // Clear DOM content from all existing page editors
    pageRefs.current.forEach((ed) => {
      if (ed) ed.innerHTML = '';
    });
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }

    const emptyDoc = [{ id: 1, content: '', header: '', footer: '' }];
    setPages(emptyDoc);
    setCurrentPage(0);
    pageRefs.current = [];
    localStorage.removeItem('openword_doc');
  };

  // BUTTONS: Edit Header, Edit Footer
  // Switches editor to header/footer editing mode
  // Loads header/footer content into editor for editing
  // Header/footer applies to ALL pages (shared across document)
  const editHeaderFooter = (mode) => {
    setHeaderFooterMode(mode);
  };

  // Ensure there is a page after the given index; if not, create one
  const ensureNextPage = (fromIndex) => {
    setPages((prev) => {
      if (prev[fromIndex + 1]) return prev;
      const newPages = [...prev];
      newPages.splice(fromIndex + 1, 0, {
        id: prev.length + 1,
        content: '',
        header: prev[0]?.header || '',
        footer: prev[0]?.footer || '',
      });
      return newPages.map((p, i) => ({ ...p, id: i + 1 }));
    });
  };

  // BUTTON: Done Editing (green button in header/footer mode)
  // Exits header/footer mode and returns to normal content editing
  const exitHeaderFooter = () => {
    setHeaderFooterMode(null);
    // Content will reload automatically via useEffect
  };

  // ============================================================================
  // RENDER UI
  // ============================================================================
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ========================================================================
          TOOLBAR - Sticky header with all formatting controls
          ======================================================================== */}
      <div className="bg-white border-b border-gray-300 p-3 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center">
          {/* File Operations: Reset */}
          <div className="flex gap-1 border-r pr-2">
            {/* Reset button - Clears entire document */}
            <button
              onClick={resetDocument}
              className="p-2 hover:bg-red-50 rounded text-red-600"
              title="Reset document (clear all pages, header, footer)"
            >
              Reset
            </button>
          </div>

          {/* Font Family Picker - Dropdown with 29 fonts */}
          <div className="relative" ref={fontPickerRef}>
            <button
              onClick={() => setShowFontPicker(!showFontPicker)}
              className="px-3 py-1 border rounded hover:bg-gray-100 text-sm min-w-[120px] text-left"
              style={{ fontFamily: currentFontFamily }}
            >
              {currentFontFamily}
            </button>
            {showFontPicker && (
              <div className="absolute top-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto z-20">
                {FONTS.map((font) => (
                  <button
                    key={font}
                    onClick={() => applyFont(font)}
                    className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm whitespace-nowrap"
                    style={{
                      fontFamily: font.includes(" ") ? `"${font}"` : font,
                    }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Style Selector - Heading 1/2/3, Title, Subtitle, Normal */}
          <select
            onChange={(e) => applyStyle(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            defaultValue="normal"
          >
            <option value="normal">Normal</option>
            <option value="heading1">Heading 1</option>
            <option value="heading2">Heading 2</option>
            <option value="heading3">Heading 3</option>
            <option value="title">Title</option>
            <option value="subtitle">Subtitle</option>
          </select>

          {/* Basic Text Formatting - Bold, Italic, Underline */}
          <div className="flex gap-1 border-l pl-2">
            {/* Bold button - Ctrl+B */}
            <button
              onClick={() => applyFormat("bold")}
              className="p-2 hover:bg-gray-100 rounded"
              title="Bold (Ctrl+B)"
            >
              <Bold size={18} />
            </button>
            {/* Italic button - Ctrl+I */}
            <button
              onClick={() => applyFormat("italic")}
              className="p-2 hover:bg-gray-100 rounded"
              title="Italic (Ctrl+I)"
            >
              <Italic size={18} />
            </button>
            {/* Underline button - Ctrl+U */}
            <button
              onClick={() => applyFormat("underline")}
              className="p-2 hover:bg-gray-100 rounded"
              title="Underline (Ctrl+U)"
            >
              <Underline size={18} />
            </button>
          </div>

          {/* Text & Highlight Colors */}
          <div className="flex gap-1 border-l pl-2">
            {/* Text Color Picker */}
            <div className="relative" ref={colorPickerRef}>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 hover:bg-gray-100 rounded flex items-center gap-1"
                title="Text Color"
              >
                <Type size={18} />
                <div
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: currentTextColor }}
                />
              </button>
              {/* Modern color picker dropdown */}
              {showColorPicker && (
                <div className="absolute top-full mt-1 bg-white border rounded-lg shadow-xl p-3 z-20">
                  <HexColorPicker
                    color={currentTextColor}
                    onChange={setCurrentTextColor}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={currentTextColor}
                      onChange={(e) => setCurrentTextColor(e.target.value)}
                      className="w-24 px-2 py-1 text-xs border rounded"
                      placeholder="#000000"
                    />
                    <button
                      onClick={applyColor}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      Apply
                    </button>
                  </div>
                  {/* Quick preset colors */}
                  <div className="mt-2 grid grid-cols-6 gap-1">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setCurrentTextColor(color)}
                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Highlight Color Picker */}
            <div className="relative" ref={highlightPickerRef}>
              <button
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                className="p-2 hover:bg-gray-100 rounded flex items-center gap-1"
                title="Highlight"
              >
                <Palette size={18} />
                <div
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: currentHighlightColor }}
                />
              </button>
              {/* Modern color picker dropdown */}
              {showHighlightPicker && (
                <div className="absolute top-full mt-1 bg-white border rounded-lg shadow-xl p-3 z-20">
                  <HexColorPicker
                    color={currentHighlightColor}
                    onChange={setCurrentHighlightColor}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={currentHighlightColor}
                      onChange={(e) => setCurrentHighlightColor(e.target.value)}
                      className="w-24 px-2 py-1 text-xs border rounded"
                      placeholder="#ffff00"
                    />
                    <button
                      onClick={applyHighlight}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      Apply
                    </button>
                  </div>
                  {/* Quick preset colors */}
                  <div className="mt-2 grid grid-cols-6 gap-1">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setCurrentHighlightColor(color)}
                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text Alignment - Left, Center, Right */}
          <div className="flex gap-1 border-l pl-2">
            {/* Align Left - Ctrl+L */}
            <button
              onClick={() => applyAlign("left")}
              className="p-2 hover:bg-gray-100 rounded"
              title="Align Left (Ctrl+L)"
            >
              <AlignLeft size={18} />
            </button>
            {/* Align Center - Ctrl+E */}
            <button
              onClick={() => applyAlign("center")}
              className="p-2 hover:bg-gray-100 rounded"
              title="Align Center (Ctrl+E)"
            >
              <AlignCenter size={18} />
            </button>
            {/* Align Right - Ctrl+R */}
            <button
              onClick={() => applyAlign("right")}
              className="p-2 hover:bg-gray-100 rounded"
              title="Align Right (Ctrl+R)"
            >
              <AlignRight size={18} />
            </button>
          </div>

          {/* Lists - Bulleted & Numbered */}
          <div className="flex gap-1 border-l pl-2">
            {/* Bullet List - Creates <ul> */}
            <button
              onClick={() => insertList(false)}
              className="p-2 hover:bg-gray-100 rounded"
              title="Bullet List (Ctrl+Shift+8)"
            >
              <List size={18} />
            </button>
            {/* Numbered List - Creates <ol> */}
            <button
              onClick={() => insertList(true)}
              className="p-2 hover:bg-gray-100 rounded"
              title="Numbered List (Ctrl+Shift+7)"
            >
              <ListOrdered size={18} />
            </button>
          </div>

          {/* Page Controls - Header/Footer Editing (Page Break via Ctrl+Enter shortcut only) */}
          <div className="flex gap-2 border-l pl-2 ml-auto">
            {/* Header/Footer buttons - Toggle based on mode */}
            {!headerFooterMode ? (
              <>
                {/* Normal mode: Show Edit Header & Edit Footer buttons */}
                <button
                  onClick={() => editHeaderFooter("header")}
                  className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
                  title="Edit header (applies to all pages)"
                >
                  Edit Header
                </button>
                <button
                  onClick={() => editHeaderFooter("footer")}
                  className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
                  title="Edit footer (applies to all pages)"
                >
                  Edit Footer
                </button>
              </>
            ) : (
              /* Header/Footer mode: Show Done button to exit */
              <button
                onClick={exitHeaderFooter}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                title="Return to document editing"
              >
                Done Editing{" "}
                {headerFooterMode === "header" ? "Header" : "Footer"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================
          FLOATING TOOLBAR - Appears above selected text
          ======================================================================== */}
      {showFloatingBar && (
        <div
          className="fixed bg-gray-800 text-white rounded shadow-lg p-2 flex gap-1 z-50"
          style={{ left: floatingBarPos.x, top: floatingBarPos.y }}
        >
          {/* Quick access to Bold, Italic, Underline for selected text */}
          <button
            onClick={() => applyFormat("bold")}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => applyFormat("italic")}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => applyFormat("underline")}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <Underline size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================
          DOCUMENT INFO BAR - Total pages count
          ======================================================================== */}
      {!headerFooterMode && (
        <div className="bg-gray-200 p-2 text-center text-sm">
          <span className="font-semibold">
            {pages.length} Page{pages.length > 1 ? "s" : ""}
          </span>
          <span className="text-gray-600 ml-4">
            📄 Scroll to view all pages
          </span>
          <span className="text-blue-600 ml-4">
            Press Ctrl+Enter to split content at cursor
          </span>
        </div>
      )}

      {/* ========================================================================
          MAIN EDITOR - All pages displayed vertically (Google Docs style)
          ======================================================================== */}
      {headerFooterMode ? (
        // Header/Footer Edit Mode - Single editor
        <div className="flex-1 overflow-auto p-8 bg-gray-50 flex justify-center">
          <div
            className="bg-white shadow-lg p-8"
            style={{ width: PAGE_WIDTH, minHeight: "300px" }}
          >
            <div className="text-center mb-4 text-blue-600 font-semibold">
              Editing {headerFooterMode === "header" ? "Header" : "Footer"} -
              Applies to All Pages
            </div>
            <div
              ref={editorRef}
              contentEditable
              onInput={() => updatePages(0)}
              onBlur={() => updatePages(0)}
              className="p-4 focus:outline-none border-2 border-blue-200 rounded"
              style={{
                fontSize: "16px",
                lineHeight: "1.5",
                minHeight: "150px",
              }}
              suppressContentEditableWarning={true}
            />
          </div>
        </div>
      ) : (
        // Normal Mode - All pages vertically scrollable
        <div className="flex-1 overflow-auto p-8 bg-gray-50">
          <div className="max-w-5xl mx-auto space-y-8">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className="bg-white page-container mx-auto flex flex-col"
                style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
              >
                {/* Header - Shown on every page */}
                {page.header && (
                  <div
                    className="border-b border-gray-300 p-4 text-gray-500 text-sm"
                    dangerouslySetInnerHTML={{ __html: page.header }}
                  />
                )}

                {/* Page Content Editor */}
                <div
                  ref={(el) => (pageRefs.current[index] = el)}
                  contentEditable
                  onInput={() => updatePages(index)}
                  onBlur={() => updatePages(index)}
                  onFocus={() => setCurrentPage(index)}
                  className="p-12 focus:outline-none overflow-hidden"
                  style={{
                    fontSize: "16px",
                    lineHeight: "1.5",
                    minHeight: `${CONTENT_MAX_HEIGHT}px`,
                    maxHeight: `${CONTENT_MAX_HEIGHT}px`,
                  }}
                  suppressContentEditableWarning={true}
                />

                {/* Footer - Shown on every page */}
                <div className="mt-auto">
                  {page.footer && (
                    <div
                      className="border-t border-gray-300 p-4 text-gray-500 text-sm"
                      dangerouslySetInnerHTML={{ __html: page.footer }}
                    />
                  )}

                  {/* Page Number */}
                  <div className="text-center text-gray-400 text-xs pb-4">
                    Page {page.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================
          HELP BAR - Keyboard shortcuts reference
          ======================================================================== */}
      <div className="bg-gray-200 p-2 text-xs text-gray-600 text-center">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>Tab / Shift+Tab (Indent / Outdent lists)</span>
          <span>Ctrl+B (Bold)</span>
          <span>Ctrl+I (Italic)</span>
          <span>Ctrl+U (Underline)</span>
          <span>Ctrl+L/E/R (Align)</span>
          <span>Ctrl+Shift+7/8 (Lists)</span>
          <span>Ctrl+Enter (Page Break)</span>
          <span>Ctrl+S (Save)</span>
        </div>
      </div>
    </div>
  );
}
