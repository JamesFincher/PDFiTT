# Agent Instructions

PDFiTT is an open-source, self-hostable Markdown-to-PDF generation MCP. When working in this repo, optimize changes for both human operators and LLM agents that need to install, configure, deploy, and verify their own hosted PDF tool.

## First Files To Read

1. `llms.txt` for the machine-oriented project map.
2. `README.md` for the human-facing overview.
3. `SELF_HOSTING.md` for local setup, deployment, and validation.
4. `docs/PDFiTT-System-Documentation.md` for full architecture details.

## Project Shape

- Frontend: React, Vite, Tailwind CSS.
- PDF rendering: `marked` tokenization plus `pdfmake` document generation.
- Shared conversion logic: `src/lib/markdownPdf.js`.
- Server-side PDF buffers: `src/lib/pdfBuffer.js`.
- Direct PDF endpoint: `api/pdf.js`.
- Remote MCP endpoint: `api/mcp.js`.
- Agent skill: `skills/pdfitt-markdown-pdf`.

## Development Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

MCP render smoke test:

```bash
node skills/pdfitt-markdown-pdf/scripts/render_pdf_via_mcp.mjs \
  --mcp-url https://pdf-i-tt.vercel.app/mcp \
  --markdown-file sample.md \
  --out /tmp/pdfitt-smoke.pdf
```

## Self-Hosted Deployment Rules

- Use `PDFITT_PUBLIC_URL` for the deployed origin, such as `https://your-tool.vercel.app`.
- Do not include a trailing slash in `PDFITT_PUBLIC_URL`.
- Set `PDFITT_ALLOWED_ORIGINS` when a deployment should restrict browser/API callers.
- Replace hosted examples with the user's deployed origin when configuring a fork.
- Verify `/mcp`, `/api/pdf`, and the browser UI after deployment.

## MCP Rules

- MCP path is `/mcp`.
- Transport is `streamable_http`.
- Tools are `render_markdown_pdf` and `get_setup_instructions`.
- Do not send private local paths to the remote MCP server.
- For local files, read Markdown locally and pass the content as `markdown`.
- Use `source_url` only for public HTTP or HTTPS Markdown URLs.

## Documentation Rules

- Keep README practical for humans.
- Keep `llms.txt` concise and deterministic for LLM agents.
- Keep `SELF_HOSTING.md` complete enough that another developer can fork and deploy without extra context.
- If the MCP API changes, update `api/mcp.js`, `README.md`, `SELF_HOSTING.md`, `llms.txt`, `skills/pdfitt-markdown-pdf/SKILL.md`, and `docs/PDFiTT-System-Documentation.md`.
- If Markdown rendering changes, update docs and test headings, lists, tables, blockquotes, code blocks, links, task lists, and long words.

## Release Checklist

Before publishing:

```bash
npm run lint
npm run build
node skills/pdfitt-markdown-pdf/scripts/render_pdf_via_mcp.mjs --mcp-url https://pdf-i-tt.vercel.app/mcp --markdown-file docs/PDFiTT-System-Documentation.md --out docs/PDFiTT-System-Documentation.pdf --filename PDFiTT-Open-Source-PDF-Generation-MCP.pdf
```

Then verify:

- `docs/PDFiTT-System-Documentation.pdf` exists and opens as a PDF.
- `curl <origin>/mcp` returns setup instructions.
- Direct API can render a small document.
- MCP clients can call `render_markdown_pdf`.
