import pdfMake from 'pdfmake/build/pdfmake.js'
import pdfFonts from 'pdfmake/build/vfs_fonts.js'
import { Buffer } from 'node:buffer'
import { buildDocDefinition, cleanText, getDocumentTitle, sanitizeFileName, validateMarkdown } from './markdownPdf.js'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs || pdfFonts.default || pdfFonts

export const resolveMarkdownInput = async ({ markdown, markdown_base64: markdownBase64, source_url: sourceUrl } = {}) => {
  if (typeof markdown === 'string') return markdown

  if (typeof markdownBase64 === 'string') {
    return Buffer.from(markdownBase64, 'base64').toString('utf8')
  }

  if (typeof sourceUrl === 'string') {
    const url = new URL(sourceUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('source_url must use http or https.')
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Could not fetch source_url. Received HTTP ${response.status}.`)
    }

    return response.text()
  }

  throw new Error('Provide markdown, markdown_base64, or source_url.')
}

export const renderMarkdownPdfBuffer = async (markdown) => {
  validateMarkdown(markdown)

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(buildDocDefinition(markdown)).getBuffer((buffer) => {
        resolve(Buffer.from(buffer))
      })
    } catch (error) {
      reject(error)
    }
  })
}

export const getPdfFileName = (markdown, requestedFileName) => {
  const baseName = cleanText(requestedFileName || getDocumentTitle(markdown))
  const safeName = sanitizeFileName(baseName)
  return safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`
}
