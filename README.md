# PDFiTT

PDFiTT is an open-source PDF generation MCP for rendering Markdown into polished PDF documents. It ships as a browser editor, a direct HTTP PDF API, a remote Streamable HTTP MCP server, and a portable local agent skill.

Use the hosted instance, fork it, or self-host your own branded Markdown-to-PDF tool.

Deployed endpoint:

```text
https://pdf-i-tt.vercel.app/mcp
```

LLM entry point:

```text
https://pdf-i-tt.vercel.app/llms.txt
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JamesFincher/PDFiTT)

## What It Provides

- Open-source Markdown-to-PDF generation under the MIT License.
- Remote MCP tool for agents and MCP clients.
- Direct Vercel Function API for apps and scripts.
- Browser editor with live preview and one-click PDF download.
- Portable skill at `skills/pdfitt-markdown-pdf`.
- Shared renderer across browser, API, and MCP workflows.

## Features

- GitHub Flavored Markdown parsing with `marked`.
- PDF generation with `pdfmake`.
- Support for headings, lists, task lists, blockquotes, code blocks, inline code, links, tables, horizontal rules, and image placeholders.
- Safer export behavior for raw HTML and script content.
- Filename derivation from the first H1 heading.
- 250,000-character Markdown input limit.

## Documentation

The full system documentation is available in both source and rendered form:

- `llms.txt`
- `AGENTS.md`
- `SELF_HOSTING.md`
- `CHANGELOG.md`
- `docs/PDFiTT-System-Documentation.md`
- `docs/PDFiTT-System-Documentation.pdf`

If you are pointing an LLM at this repository, start with `llms.txt`.

## Quick Start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Quality checks:

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

Connect any MCP client that supports remote Streamable HTTP servers to:

```text
https://pdf-i-tt.vercel.app/mcp
```

The MCP server exposes:

```text
render_markdown_pdf
get_setup_instructions
```

`render_markdown_pdf` returns JSON containing `filename`, `mimeType`, `byteLength`, and base64 PDF bytes.

`get_setup_instructions` returns generic MCP, Claude Code, OpenCode, Codex, local skill, script, and direct API setup instructions. A normal browser or `curl` GET to `/mcp` returns the same setup payload:

```bash
curl https://pdf-i-tt.vercel.app/mcp
```

Claude Code remote HTTP setup:

```bash
claude mcp add --transport http pdfitt https://pdf-i-tt.vercel.app/mcp
```

Codex remote MCP setup:

```bash
codex mcp add pdfitt --url https://pdf-i-tt.vercel.app/mcp
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

## Self-Host Your Own PDF Tool

PDFiTT is designed so other developers and teams can host their own PDF generation MCP.

1. Fork this repository.
2. Deploy it to Vercel.
3. Set `PDFITT_PUBLIC_URL` to your deployed origin, for example `https://your-pdf-tool.vercel.app`.
4. Optionally set `PDFITT_ALLOWED_ORIGINS` to restrict browser/API callers.
5. Connect MCP clients to `https://your-pdf-tool.vercel.app/mcp`.
6. Use the direct API at `https://your-pdf-tool.vercel.app/api/pdf`.

For local development:

```bash
npm install
npm run dev
```

For a production check:

```bash
npm run lint
npm run build
```

See `SELF_HOSTING.md` for a fuller deployment checklist and customization notes.

After deployment, replace every `https://pdf-i-tt.vercel.app` example with your own origin.

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

Use it from Codex, OpenCode, or any agent runtime that supports local skills by copying that folder into the relevant skills directory. The included `agents/openai.yaml` and `agents/opencode.json` templates point at the hosted MCP endpoint.

Scripted render example:

```bash
node skills/pdfitt-markdown-pdf/scripts/render_pdf_via_mcp.mjs \
  --mcp-url https://pdf-i-tt.vercel.app/mcp \
  --markdown-file ./notes.md \
  --out ./notes.pdf
```

## Deployment

`vercel.json` rewrites `/mcp` to `/api/mcp` and configures 30-second function durations for both PDF and MCP rendering endpoints.

Relevant environment variables:

- `PDFITT_PUBLIC_URL`: base URL used in generated setup instructions.
- `PDFITT_ALLOWED_ORIGINS`: comma-separated allowed origins for API and MCP requests.
- `PDFITT_MCP_URL`: local skill script fallback for the MCP endpoint URL.

## License

MIT License. See `LICENSE`.
