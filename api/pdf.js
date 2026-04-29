import { getPdfFileName, renderMarkdownPdfBuffer, resolveMarkdownInput } from '../src/lib/pdfBuffer.js'
import process from 'node:process'

const json = (res, status, body) => {
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

export default async function handler(req, res) {
  if (!isAllowedOrigin(req)) {
    return json(res, 403, { error: 'Origin is not allowed.' })
  }

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return json(res, 405, { error: 'Use POST to render a PDF.' })
  }

  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const markdown = await resolveMarkdownInput(input)
    const pdfBuffer = await renderMarkdownPdfBuffer(markdown)
    const fileName = getPdfFileName(markdown, input?.filename)

    res.status(200)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', String(pdfBuffer.length))
    res.end(pdfBuffer)
  } catch (error) {
    json(res, 400, { error: error.message || 'Could not render PDF.' })
  }
}
