# PDFiTT

PDFiTT is a browser-based Markdown-to-PDF converter built with React, Vite, Tailwind CSS, `marked`, and `pdfmake`.

The app gives users a split editor/preview workflow, renders GitHub-flavored Markdown for review, and generates a downloadable PDF with styled headings, paragraphs, lists, code blocks, links, and blockquotes.

## Features

- Live Markdown preview
- One-click PDF download
- Responsive editor and preview tabs for smaller screens
- Styled PDF output using built-in Helvetica, Courier, and Times fonts
- Support for headings, lists, inline formatting, links, blockquotes, and fenced code blocks

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- marked
- pdfmake

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

PDF generation runs in the browser. No document content is sent to a backend service.
