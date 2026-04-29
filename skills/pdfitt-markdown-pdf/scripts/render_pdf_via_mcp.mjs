#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

const usage = `Usage:
  node render_pdf_via_mcp.mjs --mcp-url https://pdf-i-tt.vercel.app/mcp --markdown-file input.md --out output.pdf
  node render_pdf_via_mcp.mjs --mcp-url https://pdf-i-tt.vercel.app/mcp --markdown "# Title" --out output.pdf
  PDFITT_MCP_URL=https://pdf-i-tt.vercel.app/mcp node render_pdf_via_mcp.mjs --source-url https://example.com/file.md
`

const args = process.argv.slice(2)

const readArg = (name) => {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  return args[index + 1]
}

const mcpUrl = readArg('--mcp-url') || process.env.PDFITT_MCP_URL
const markdownFile = readArg('--markdown-file')
const markdown = readArg('--markdown')
const markdownBase64 = readArg('--markdown-base64')
const sourceUrl = readArg('--source-url')
const outPath = readArg('--out')
const fileName = readArg('--filename')

if (!mcpUrl) {
  console.error(`Missing --mcp-url or PDFITT_MCP_URL.\n\n${usage}`)
  process.exit(2)
}

const inputCount = [markdownFile, markdown, markdownBase64, sourceUrl].filter(Boolean).length
if (inputCount !== 1) {
  console.error(`Provide exactly one input: --markdown-file, --markdown, --markdown-base64, or --source-url.\n\n${usage}`)
  process.exit(2)
}

const postMcp = async (body, extraHeaders = {}) => {
  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'Mcp-Method': body.method,
      ...extraHeaders
    },
    body: JSON.stringify(body)
  })

  if (response.status === 202) return null

  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`MCP returned HTTP ${response.status}: ${text}`)
  }

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `MCP returned HTTP ${response.status}`)
  }

  return payload
}

const main = async () => {
  await postMcp({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'pdfitt-skill-script',
        version: '1.0.0'
      }
    }
  })

  await postMcp({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  })

  const toolArguments = {}
  if (markdownFile) toolArguments.markdown = await fs.readFile(markdownFile, 'utf8')
  if (markdown) toolArguments.markdown = markdown
  if (markdownBase64) toolArguments.markdown_base64 = markdownBase64
  if (sourceUrl) toolArguments.source_url = sourceUrl
  if (fileName) toolArguments.filename = fileName

  const response = await postMcp(
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'render_markdown_pdf',
        arguments: toolArguments
      }
    },
    { 'Mcp-Name': 'render_markdown_pdf' }
  )

  const resultText = response.result?.content?.find((item) => item.type === 'text')?.text
  if (!resultText) throw new Error('MCP response did not include PDF payload text.')

  const result = JSON.parse(resultText)
  const output = outPath || result.filename || 'pdfitt-document.pdf'
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true })
  await fs.writeFile(output, Buffer.from(result.base64, 'base64'))
  console.log(JSON.stringify({ output, filename: result.filename, byteLength: result.byteLength }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
