import { getPdfFileName, renderMarkdownPdfBuffer, resolveMarkdownInput } from '../src/lib/pdfBuffer.js'
import process from 'node:process'

const MCP_PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'pdfitt-markdown-pdf', version: '1.0.0' }
const PUBLIC_BASE_URL = process.env.PDFITT_PUBLIC_URL || 'https://pdf-i-tt.vercel.app'
const MCP_URL = `${PUBLIC_BASE_URL}/mcp`

const setupInstructions = {
  summary: 'PDFiTT is an open-source PDF generation MCP that renders Markdown into formatted PDFs through a self-hostable remote MCP tool and optional local agent skill.',
  mcp: {
    url: MCP_URL,
    transport: 'streamable_http',
    protocolVersion: MCP_PROTOCOL_VERSION,
    tools: ['render_markdown_pdf', 'get_setup_instructions'],
    note: 'Any MCP client that supports remote Streamable HTTP MCP servers can connect to this URL. No app framework, model provider, or agent runtime is required.'
  },
  selfHosting: {
    source: 'https://github.com/JamesFincher/PDFiTT',
    license: 'MIT',
    publicUrlEnv: 'PDFITT_PUBLIC_URL',
    allowedOriginsEnv: 'PDFITT_ALLOWED_ORIGINS',
    docs: ['README.md', 'llms.txt', 'AGENTS.md', 'SELF_HOSTING.md', 'docs/PDFiTT-System-Documentation.md'],
    note: 'Fork the repository, deploy it to Vercel, set PDFITT_PUBLIC_URL to your deployed origin, and connect MCP clients to <your-origin>/mcp.'
  },
  genericClient: {
    name: 'pdfitt',
    type: 'remote',
    url: MCP_URL,
    enabled: true,
    note: 'For clients with JSON MCP config, add a remote server named pdfitt that points at this URL.'
  },
  claudeCode: {
    command: `claude mcp add --transport http pdfitt ${MCP_URL}`,
    note: 'After adding the MCP server, restart Claude Code or use /mcp to verify the connection.'
  },
  codexRemote: {
    command: `codex mcp add pdfitt --url ${MCP_URL}`,
    note: 'After adding the MCP server, restart Codex if your active session does not show the new tools.'
  },
  opencode: {
    configFile: '~/.config/opencode/opencode.json or ./opencode.json',
    config: {
      $schema: 'https://opencode.ai/config.json',
      mcp: {
        pdfitt: {
          type: 'remote',
          url: MCP_URL,
          enabled: true
        }
      }
    },
    note: 'Merge this mcp block into your OpenCode config, then restart OpenCode or run its MCP debug flow.'
  },
  codex: {
    skillInstall: 'Copy this repository folder skills/pdfitt-markdown-pdf into ${CODEX_HOME:-~/.codex}/skills/pdfitt-markdown-pdf.',
    note: 'The bundled skill uses this MCP URL and includes scripts/render_pdf_via_mcp.mjs for deterministic PDF rendering.'
  },
  localSkillIfSupported: {
    folder: 'skills/pdfitt-markdown-pdf',
    installTargets: [
      '${CODEX_HOME:-~/.codex}/skills/pdfitt-markdown-pdf',
      '~/.config/opencode/skills/pdfitt-markdown-pdf',
      './.opencode/skills/pdfitt-markdown-pdf',
      'any equivalent skills directory supported by the agent runtime'
    ],
    script: `node skills/pdfitt-markdown-pdf/scripts/render_pdf_via_mcp.mjs --mcp-url ${MCP_URL} --markdown-file ./notes.md --out ./notes.pdf`,
    note: 'If your agent supports local skills, install the skill folder and keep the MCP dependency URL pointed at this endpoint.'
  },
  directApi: {
    url: `${PUBLIC_BASE_URL}/api/pdf`,
    example: `curl -X POST "${PUBLIC_BASE_URL}/api/pdf" -H "Content-Type: application/json" --output document.pdf --data '{"markdown":"# Hello\\n\\nRendered by PDFiTT."}'`
  }
}

const setupInstructionsText = `PDFiTT open-source Markdown-to-PDF MCP setup

Remote MCP endpoint:
${setupInstructions.mcp.url}

Self-hosting:
Fork ${setupInstructions.selfHosting.source}, deploy to Vercel, set PDFITT_PUBLIC_URL to your deployed origin, and connect clients to <your-origin>/mcp.

LLM/human setup docs:
Start with README.md, llms.txt, AGENTS.md, SELF_HOSTING.md, and docs/PDFiTT-System-Documentation.md.

Generic MCP client:
Add a remote Streamable HTTP MCP server named "pdfitt" with URL ${setupInstructions.mcp.url}.

Claude Code:
${setupInstructions.claudeCode.command}

Codex remote MCP:
${setupInstructions.codexRemote.command}

OpenCode:
Add this to ~/.config/opencode/opencode.json or ./opencode.json:
${JSON.stringify(setupInstructions.opencode.config, null, 2)}

Codex local skill:
${setupInstructions.codex.skillInstall}

Other local-skill agents:
Copy skills/pdfitt-markdown-pdf into the runtime's supported skills directory, for example ~/.config/opencode/skills/pdfitt-markdown-pdf or ./.opencode/skills/pdfitt-markdown-pdf.

Local skill script:
${setupInstructions.localSkillIfSupported.script}

Direct PDF API:
${setupInstructions.directApi.url}
`

const renderTool = {
  name: 'render_markdown_pdf',
  title: 'Render Markdown PDF',
  description:
    'Render Markdown into a formatted PDF. Provide markdown directly, as base64, or via a public http(s) source_url. Returns base64 PDF bytes plus filename metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      markdown: {
        type: 'string',
        description: 'Markdown content to render. Use this for direct text input.'
      },
      markdown_base64: {
        type: 'string',
        description: 'Base64-encoded UTF-8 Markdown content. Use this when direct text transport is inconvenient.'
      },
      source_url: {
        type: 'string',
        description: 'Public http(s) URL containing Markdown content to fetch and render.'
      },
      filename: {
        type: 'string',
        description: 'Optional PDF filename. Defaults to the first H1 heading or pdfitt-document.pdf.'
      }
    },
    additionalProperties: false
  }
}

const setupTool = {
  name: 'get_setup_instructions',
  title: 'Get Setup Instructions',
  description:
    'Return framework-agnostic instructions for connecting to this PDFiTT MCP server from MCP clients such as Claude Code, Codex, OpenCode, or any runtime that supports remote Streamable HTTP MCP. Includes optional local skill setup where supported.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
}

const jsonRpc = (id, result) => ({
  jsonrpc: '2.0',
  id,
  result
})

const jsonRpcError = (id, code, message) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message }
})

const sendJson = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const isAllowedOrigin = (req) => {
  const origin = req.headers.origin
  if (!origin) return true

  const allowedOrigins = (process.env.PDFITT_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (allowedOrigins.includes(origin)) return true

  try {
    const originUrl = new URL(origin)
    return originUrl.host === req.headers.host || originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

const validateMcpHeaders = (req, body) => {
  const methodHeader = req.headers['mcp-method']
  const nameHeader = req.headers['mcp-name']

  if (methodHeader && methodHeader !== body.method) {
    throw new Error(`Header mismatch: Mcp-Method ${methodHeader} does not match ${body.method}.`)
  }

  if (body.method === 'tools/call') {
    const toolName = body.params?.name
    if (nameHeader && nameHeader !== toolName) {
      throw new Error(`Header mismatch: Mcp-Name ${nameHeader} does not match ${toolName}.`)
    }
  }
}

const handleRequest = async (body) => {
  switch (body.method) {
    case 'initialize':
      return jsonRpc(body.id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: {}
        },
        serverInfo: SERVER_INFO,
        instructions: setupInstructionsText,
        _meta: {
          setup: setupInstructions
        }
      })

    case 'ping':
      return jsonRpc(body.id, {})

    case 'tools/list':
      return jsonRpc(body.id, {
        tools: [renderTool, setupTool]
      })

    case 'tools/call': {
      if (body.params?.name === setupTool.name) {
        return jsonRpc(body.id, {
          content: [
            {
              type: 'text',
              text: setupInstructionsText
            }
          ],
          structuredContent: setupInstructions
        })
      }

      if (body.params?.name !== renderTool.name) {
        return jsonRpcError(body.id, -32602, `Unknown tool: ${body.params?.name || 'missing'}`)
      }

      const args = body.params?.arguments || {}
      const markdown = await resolveMarkdownInput(args)
      const pdfBuffer = await renderMarkdownPdfBuffer(markdown)
      const filename = getPdfFileName(markdown, args.filename)
      const payload = {
        filename,
        mimeType: 'application/pdf',
        byteLength: pdfBuffer.length,
        base64: pdfBuffer.toString('base64')
      }

      return jsonRpc(body.id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload)
          }
        ],
        structuredContent: payload
      })
    }

    case 'notifications/initialized':
      return null

    default:
      return jsonRpcError(body.id, -32601, `Method not found: ${body.method}`)
  }
}

export default async function handler(req, res) {
  if (!isAllowedOrigin(req)) {
    return sendJson(res, 403, jsonRpcError(null, -32000, 'Origin is not allowed.'))
  }

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Method, Mcp-Name, Mcp-Session-Id, MCP-Protocol-Version')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method === 'GET') {
    const accept = req.headers.accept || ''
    if (!accept.includes('text/event-stream')) {
      return sendJson(res, 200, {
        ...setupInstructions,
        instructions: setupInstructionsText
      })
    }

    res.setHeader('Allow', 'POST, OPTIONS')
    return sendJson(res, 405, jsonRpcError(null, -32000, 'This stateless MCP endpoint supports POST only.'))
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return sendJson(res, 405, jsonRpcError(null, -32000, 'Use POST for MCP requests.'))
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    validateMcpHeaders(req, body)
    const response = await handleRequest(body)

    if (!response) {
      res.status(202).end()
      return
    }

    sendJson(res, 200, response)
  } catch (error) {
    sendJson(res, 400, jsonRpcError(null, -32603, error.message || 'MCP request failed.'))
  }
}
