# PDFiTT

PDFiTT is an executive-focused Markdown-to-PDF workspace built with React, Vite, Tailwind CSS, `marked`, and `pdfmake`.

## What changed

This version overhauls the rendering pipeline so PDFs are generated from Markdown tokens (not line-by-line string parsing). The new flow gives consistent output suitable for leadership and client-facing documents.

### Upgraded PDF conversion logic

- Token-driven parser using `marked.lexer(...)`
- Consistent typography, spacing, and page margins
- Corporate-friendly color palette and footer with confidentiality/page numbers
- Better handling for:
  - Headings
  - Ordered and unordered lists (including nested content)
  - Blockquotes
  - Code blocks + inline code
  - Horizontal rules
  - Markdown tables

## Features

- Live Markdown preview
- One-click executive PDF download
- Responsive editor + preview tabs on smaller screens
- Professional starter template for strategy briefs and reports

## Local Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run build
```

## Notes

PDF generation runs fully in-browser. No document content is sent to a backend service.
