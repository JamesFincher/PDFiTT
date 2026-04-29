---
name: pdfitt-markdown-pdf
description: Render Markdown text or Markdown files into polished PDFs through the open-source, self-hostable PDFiTT MCP server. Use when the user asks an agent in Codex, Claude Code, OpenCode, or another MCP-capable environment to convert Markdown content, a .md file, pasted Markdown, base64 Markdown, or a public Markdown URL into a formatted PDF.
---

# PDFiTT Markdown PDF

Use PDFiTT when the user wants Markdown turned into a formatted PDF. Prefer the remote MCP tool when available; use the bundled script when the agent needs a deterministic command-line path. The MCP server is runtime-neutral: any client that supports remote Streamable HTTP MCP can connect to it.

PDFiTT is open source and self-hostable. If the user is deploying a fork, replace `https://pdf-i-tt.vercel.app` with their deployed origin, and set `PDFITT_PUBLIC_URL` on the deployment so returned setup instructions point at the fork.

## Inputs

Accept one of:

- Direct Markdown text.
- A local Markdown file. Read it, then send the content to the MCP tool.
- Base64-encoded UTF-8 Markdown.
- A public `http` or `https` URL containing raw Markdown.

Do not send private local paths to the remote MCP server. Remote MCP cannot read the agent's local filesystem; read local files yourself and pass the Markdown content.

## Remote MCP

The hosted site exposes a stateless Streamable HTTP MCP endpoint at:

```text
https://pdf-i-tt.vercel.app/mcp
```

Generic MCP clients should register a remote Streamable HTTP MCP server named `pdfitt` with this URL. No app framework, model provider, or agent runtime is required.

Self-hosted deployments expose the same path at:

```text
<origin>/mcp
```

For a self-hosted instance, use the deployed origin in all client setup commands.

Claude Code can add it with:

```bash
claude mcp add --transport http pdfitt https://pdf-i-tt.vercel.app/mcp
```

Codex can add it with:

```bash
codex mcp add pdfitt --url https://pdf-i-tt.vercel.app/mcp
```

OpenCode can add it by merging this block into `~/.config/opencode/opencode.json` or a project-level `opencode.json`:

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

The same template is included at `agents/opencode.json`.

The MCP server provides these tools:

```text
render_markdown_pdf
get_setup_instructions
```

Tool arguments:

- `markdown`: Markdown content as a string.
- `markdown_base64`: Base64-encoded UTF-8 Markdown.
- `source_url`: Public URL for raw Markdown.
- `filename`: Optional output filename.

The tool returns JSON text with:

- `filename`
- `mimeType`
- `byteLength`
- `base64`

Decode `base64` to write the PDF file.

Call `get_setup_instructions` when an agent or user needs generic MCP connection details, Claude Code setup, OpenCode setup, Codex local skill setup, script usage, or the direct API URL. A normal GET request to `https://pdf-i-tt.vercel.app/mcp` returns the same setup payload for humans and setup scripts.

## Local Skill Installation

For Codex:

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/pdfitt-markdown-pdf "${CODEX_HOME:-$HOME/.codex}/skills/"
```

For a self-hosted deployment, pass the forked endpoint to the script with `--mcp-url <origin>/mcp` or set `PDFITT_MCP_URL=<origin>/mcp`.

For OpenCode, if local skills are enabled in your runtime, copy the folder into a global or project skills directory:

```bash
mkdir -p "$HOME/.config/opencode/skills"
cp -R skills/pdfitt-markdown-pdf "$HOME/.config/opencode/skills/"
```

or:

```bash
mkdir -p .opencode/skills
cp -R skills/pdfitt-markdown-pdf .opencode/skills/
```

For other agents, copy this skill folder into the agent's supported local skill directory if the agent supports local skills. Keep `agents/openai.yaml`, `agents/opencode.json`, or the equivalent dependency config pointed at `https://pdf-i-tt.vercel.app/mcp`.

## Script

Use `scripts/render_pdf_via_mcp.mjs` when you need a repeatable local command:

```bash
node skills/pdfitt-markdown-pdf/scripts/render_pdf_via_mcp.mjs \
  --mcp-url https://pdf-i-tt.vercel.app/mcp \
  --markdown-file ./notes.md \
  --out ./notes.pdf
```

You can also set `PDFITT_MCP_URL` instead of passing `--mcp-url`.

## Workflow

1. If the user gave a file, read it locally first.
2. Call `render_markdown_pdf` with `markdown` and optional `filename`.
3. Decode the returned base64 PDF to the requested output path.
4. If no output path is given, use the returned `filename`.
5. Report the PDF path and any validation warnings.

## Limits

Keep Markdown under 250,000 characters. The MCP server rejects empty Markdown, non-string Markdown, unsupported URL schemes, and oversized input.
