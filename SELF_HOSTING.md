# Self-Hosting PDFiTT

PDFiTT is an open-source PDF generation MCP for teams, developers, and agents that need a hosted Markdown-to-PDF tool. You can use the public hosted endpoint or fork this repository and deploy your own instance.

## What You Get

A self-hosted PDFiTT deployment provides:

- Browser Markdown editor and PDF download UI.
- Direct HTTP PDF API at `/api/pdf`.
- Streamable HTTP MCP endpoint at `/mcp`.
- Agent skill and script for deterministic MCP rendering.
- Setup instructions returned from `GET /mcp` and the `get_setup_instructions` MCP tool.

## Requirements

- Node.js 18 or newer.
- npm.
- A Vercel account for the recommended deployment path.
- An MCP client if you want agent integration.

## Local Setup

```bash
git clone https://github.com/JamesFincher/PDFiTT.git
cd PDFiTT
npm install
npm run dev
```

Open the local URL printed by Vite.

Run checks:

```bash
npm run lint
npm run build
```

## Deploy To Vercel

1. Fork `https://github.com/JamesFincher/PDFiTT`.
2. Create a new Vercel project from your fork.
3. Use the default build settings detected by Vercel.
4. Add environment variables as needed.
5. Deploy.

Recommended environment variable:

```text
PDFITT_PUBLIC_URL=https://your-pdf-tool.vercel.app
```

Do not include a trailing slash. This value is used to generate MCP setup instructions for your hosted instance.

Optional origin allowlist:

```text
PDFITT_ALLOWED_ORIGINS=https://your-pdf-tool.vercel.app,https://your-app.example.com
```

When `PDFITT_ALLOWED_ORIGINS` is unset, same-host requests and localhost development origins are allowed.

## Verify A Deployment

Replace `<origin>` with your deployed origin.

Check setup instructions:

```bash
curl <origin>/mcp
```

Render through the direct API:

```bash
curl -X POST "<origin>/api/pdf" \
  -H "Content-Type: application/json" \
  --output /tmp/pdfitt-api-test.pdf \
  --data '{"markdown":"# PDFiTT API Test\n\nRendered from a self-hosted deployment."}'
```

Render through MCP with the bundled script:

```bash
node skills/pdfitt-markdown-pdf/scripts/render_pdf_via_mcp.mjs \
  --mcp-url <origin>/mcp \
  --markdown "# PDFiTT MCP Test" \
  --out /tmp/pdfitt-mcp-test.pdf
```

Expected result:

- `/tmp/pdfitt-api-test.pdf` exists.
- `/tmp/pdfitt-mcp-test.pdf` exists.
- `curl <origin>/mcp` returns JSON with `render_markdown_pdf`, `get_setup_instructions`, and URLs pointing at your origin.

## Connect MCP Clients

Use your origin, not the hosted demo URL.

Codex:

```bash
codex mcp add pdfitt --url <origin>/mcp
```

Claude Code:

```bash
claude mcp add --transport http pdfitt <origin>/mcp
```

OpenCode:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "pdfitt": {
      "type": "remote",
      "url": "<origin>/mcp",
      "enabled": true
    }
  }
}
```

Generic MCP clients:

- Name: `pdfitt`
- Type: remote
- Transport: Streamable HTTP
- URL: `<origin>/mcp`

## Install The Local Agent Skill

Codex:

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/pdfitt-markdown-pdf "${CODEX_HOME:-$HOME/.codex}/skills/"
```

Use your own hosted MCP endpoint with the skill script:

```bash
node skills/pdfitt-markdown-pdf/scripts/render_pdf_via_mcp.mjs \
  --mcp-url <origin>/mcp \
  --markdown-file ./notes.md \
  --out ./notes.pdf
```

You can also set:

```bash
export PDFITT_MCP_URL=<origin>/mcp
```

## API Inputs

Direct API and MCP rendering accept one Markdown source:

- `markdown`: direct Markdown string.
- `markdown_base64`: base64-encoded UTF-8 Markdown.
- `source_url`: public HTTP or HTTPS URL returning Markdown text.

Optional:

- `filename`: requested output filename.

Do not send local file paths to a remote deployment. Remote servers cannot read your local filesystem. Agents should read local files first, then send Markdown content.

## Customize Your Hosted Tool

Common branding files:

- `src/App.jsx`: browser UI labels, sample Markdown, and page copy.
- `public/PDFiTT_favicon.ico`: favicon.
- `index.html`: page title and metadata.
- `api/mcp.js`: setup instructions returned to MCP clients.
- `skills/pdfitt-markdown-pdf/SKILL.md`: agent-facing skill instructions.

Renderer files:

- `src/lib/markdownPdf.js`: Markdown token conversion and PDF document definition.
- `src/lib/pdfBuffer.js`: server-side input resolution and PDF buffer rendering.

After changing renderer behavior, test headings, lists, task lists, tables, links, blockquotes, inline code, code blocks, horizontal rules, and long words.

## Security Notes

- Browser preview HTML is sanitized with DOMPurify.
- Raw `script` and `style` HTML blocks are stripped from PDF output.
- Other HTML is reduced to plain text for PDF output.
- `source_url` only supports HTTP and HTTPS.
- Markdown input is capped at 250,000 characters.
- Optional `PDFITT_ALLOWED_ORIGINS` restricts cross-origin browser/API access.

## Troubleshooting

If MCP setup instructions point to the wrong host:

- Confirm `PDFITT_PUBLIC_URL` is set to your deployed origin.
- Redeploy after changing the environment variable.
- Run `curl <origin>/mcp` again.

If PDF rendering fails:

- Confirm Markdown is non-empty.
- Keep Markdown below 250,000 characters.
- If using `source_url`, confirm the URL is public and returns HTTP 2xx.
- Run the direct API test and MCP script test separately to isolate the failure.

If an MCP client cannot see tools:

- Confirm the client supports remote Streamable HTTP MCP.
- Confirm the configured URL is `<origin>/mcp`.
- Restart the MCP client after changing configuration.
- Run `curl <origin>/mcp` to confirm the deployment is responding.
