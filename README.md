# PDFiTT

PDFiTT is a focused Markdown-to-PDF tool. The website lets you write or paste Markdown, preview it, and download a formatted PDF.

The same formatter is also available as:

- a direct Vercel Function at `/api/pdf`
- a framework-agnostic remote MCP endpoint at `/mcp`
- a portable agent skill in `skills/pdfitt-markdown-pdf`

## Features

- Live Markdown preview
- One-click PDF download
- Token-driven PDF generation with `marked` and `pdfmake`
- Support for headings, lists, task lists, blockquotes, code blocks, inline code, links, tables, horizontal rules, and image placeholders
- Safer export behavior for raw HTML/script content

## Local Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run build
npm audit
```

## Direct PDF API

```bash
curl -X POST "https://pdf-i-tt.vercel.app/api/pdf" \
  -H "Content-Type: application/json" \
  --output document.pdf \
  --data '{"markdown":"# Hello\n\nRendered by PDFiTT."}'
```

Request JSON accepts one of:

- `markdown`
- `markdown_base64`
- `source_url`

Optional:

- `filename`

## Remote MCP

Deploy the site to Vercel and connect any MCP client that supports remote Streamable HTTP servers to:

```text
https://pdf-i-tt.vercel.app/mcp
```

The MCP server exposes:

```text
render_markdown_pdf
get_setup_instructions
```

`render_markdown_pdf` returns JSON containing `filename`, `mimeType`, `byteLength`, and base64 PDF bytes.

`get_setup_instructions` returns generic MCP, Claude Code, OpenCode, Codex, local skill, script, and direct API setup instructions. A normal browser or `curl` GET to `/mcp` also returns the same setup payload:

```bash
curl https://pdf-i-tt.vercel.app/mcp
```

Claude Code remote HTTP setup:

```bash
claude mcp add --transport http pdfitt https://pdf-i-tt.vercel.app/mcp
```

OpenCode remote MCP setup:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "pdfitt": {
      "type": "remote",
      "url": "https://pdf-i-tt.vercel.app/mcp",
      "enabled": true
    }
  }
}
```

Merge that block into `~/.config/opencode/opencode.json` for global use or `opencode.json` in a project.
The same template is included at `skills/pdfitt-markdown-pdf/agents/opencode.json`.

## Agent Skill

The portable skill lives at:

```text
skills/pdfitt-markdown-pdf
```

Codex local skill setup:

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/pdfitt-markdown-pdf "${CODEX_HOME:-$HOME/.codex}/skills/"
```

Use it from Codex, OpenCode, or any agent runtime that supports local skills by copying that folder into the relevant skills directory. The included `agents/openai.yaml` and `agents/opencode.json` templates already point at `https://pdf-i-tt.vercel.app/mcp`.

OpenCode local skill examples:

```bash
mkdir -p "$HOME/.config/opencode/skills"
cp -R skills/pdfitt-markdown-pdf "$HOME/.config/opencode/skills/"
```

```bash
mkdir -p .opencode/skills
cp -R skills/pdfitt-markdown-pdf .opencode/skills/
```
