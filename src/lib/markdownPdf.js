import { marked } from 'marked'

export const MAX_MARKDOWN_LENGTH = 250_000

export const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim()

const SOFT_BREAK = String.fromCharCode(8203)

const wrapLongText = (value = '') =>
  String(value).replace(/\S{42,}/g, (word) => word.match(/.{1,32}/g).join(SOFT_BREAK))

const htmlToText = (value = '') => {
  const withoutRawBlocks = String(value).replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  const withoutTags = withoutRawBlocks.replace(/<[^>]*>/g, '')

  return cleanText(
    withoutTags
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  )
}

export const getDocumentTitle = (markdown) => {
  const heading = marked.lexer(markdown, { gfm: true }).find((token) => token.type === 'heading' && token.depth === 1)
  return cleanText(heading?.text) || 'PDFiTT Document'
}

export const sanitizeFileName = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'pdfitt-document'

export const getWordCount = (markdown) => {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_[\]()`|:-]/g, ' ')

  return cleanText(plainText).split(/\s+/).filter(Boolean).length
}

const inlineFromTokens = (tokens = []) => {
  if (!tokens.length) return ''

  const content = []
  let skipRawHtmlBlock = false

  tokens.forEach((token) => {
    if (token.type === 'html') {
      const rawHtml = token.raw || token.text || ''
      const normalizedHtml = rawHtml.toLowerCase()

      if (/^<\s*(script|style)\b/.test(normalizedHtml)) {
        skipRawHtmlBlock = true
        return
      }

      if (/^<\s*\/\s*(script|style)\s*>/.test(normalizedHtml)) {
        skipRawHtmlBlock = false
        return
      }

      if (/^<\s*br\s*\/?>/.test(normalizedHtml)) {
        content.push('\n')
        return
      }

      const text = htmlToText(rawHtml)
      if (text) content.push({ text: wrapLongText(text) })
      return
    }

    if (skipRawHtmlBlock) return

    switch (token.type) {
      case 'text':
      case 'escape':
        if (token.tokens?.length) {
          content.push(...inlineFromTokens(token.tokens))
        } else {
          content.push({ text: wrapLongText(token.raw || token.text || '') })
        }
        break
      case 'strong':
        content.push({ text: inlineFromTokens(token.tokens), bold: true })
        break
      case 'em':
        content.push({ text: inlineFromTokens(token.tokens), italics: true })
        break
      case 'codespan':
        content.push({ text: wrapLongText(token.text || ''), style: 'inlineCode' })
        break
      case 'link':
        content.push({
          text: inlineFromTokens(token.tokens),
          link: token.href,
          color: '#2563eb',
          decoration: 'underline'
        })
        break
      case 'image':
        content.push({
          text: `[Image: ${wrapLongText(cleanText(token.text) || 'Untitled image')}]`,
          color: '#64748b',
          italics: true
        })
        break
      case 'del':
        content.push({ text: inlineFromTokens(token.tokens), decoration: 'lineThrough' })
        break
      case 'br':
        content.push('\n')
        break
      default:
        content.push({ text: wrapLongText(token.raw || token.text || '') })
    }
  })

  return content
}

const tableFromToken = (token) => {
  const headerCells = token.header.map((cell) => ({
    text: cell.tokens?.length ? inlineFromTokens(cell.tokens) : wrapLongText(cleanText(cell.text)),
    style: 'tableHeader',
    alignment: cell.align || 'left'
  }))

  const bodyRows = token.rows.map((row) =>
    row.map((cell) => ({
      text: cell.tokens?.length ? inlineFromTokens(cell.tokens) : wrapLongText(cleanText(cell.text)),
      style: 'tableCell',
      alignment: cell.align || 'left'
    }))
  )

  return {
    table: {
      headerRows: 1,
      widths: Array(token.header.length).fill('*'),
      body: [headerCells, ...bodyRows]
    },
    layout: {
      fillColor: (rowIndex) => (rowIndex === 0 ? '#f1f5f9' : null),
      hLineColor: () => '#cbd5e1',
      vLineColor: () => '#cbd5e1',
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6
    },
    margin: [0, 10, 0, 16]
  }
}

const listFromToken = (token) => {
  const items = token.items.map((item) => {
    const stack = []

    item.tokens.forEach((child) => {
      if (child.type === 'text') {
        stack.push({ text: child.tokens?.length ? inlineFromTokens(child.tokens) : child.text, style: 'listItem' })
      } else if (child.type !== 'space') {
        stack.push(...blockFromTokens([child]))
      }
    })

    if (item.task && stack[0]?.text) {
      const status = item.checked ? '[x] ' : '[ ] '
      const firstText = Array.isArray(stack[0].text) ? stack[0].text : [{ text: stack[0].text }]
      stack[0] = {
        ...stack[0],
        text: [{ text: status, color: '#475569' }, ...firstText]
      }
    }

    if (stack.length === 1) return stack[0]
    return { stack, margin: [0, 2, 0, 4] }
  })

  const list = {
    margin: [0, 4, 0, 12]
  }

  if (token.ordered) {
    list.ol = items
    if (Number.isFinite(token.start) && token.start > 1) list.start = token.start
  } else {
    list.ul = items
  }

  return list
}

const blockFromTokens = (tokens = []) => {
  const content = []

  tokens.forEach((token) => {
    if (token.type === 'heading') {
      content.push({
        text: inlineFromTokens(token.tokens),
        style: `h${Math.min(token.depth, 4)}`
      })
      return
    }

    if (token.type === 'paragraph') {
      content.push({
        text: inlineFromTokens(token.tokens),
        style: 'paragraph'
      })
      return
    }

    if (token.type === 'space') return

    if (token.type === 'list') {
      content.push(listFromToken(token))
      return
    }

    if (token.type === 'blockquote') {
      content.push({
        table: {
          widths: [4, '*'],
          body: [[
            { text: '', fillColor: '#475569', border: [false, false, false, false] },
            { stack: blockFromTokens(token.tokens), border: [false, false, false, false], margin: [10, 5, 0, 0] }
          ]]
        },
        layout: 'noBorders',
        margin: [0, 4, 0, 12]
      })
      return
    }

    if (token.type === 'code') {
      content.push({
        table: {
          widths: ['*'],
          body: [[{ text: wrapLongText(token.text || ''), style: 'codeBlock', border: [false, false, false, false], fillColor: '#f8fafc' }]]
        },
        layout: {
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8
        },
        margin: [0, 6, 0, 14]
      })
      return
    }

    if (token.type === 'html') {
      const text = htmlToText(token.raw || token.text || '')
      if (text) {
        content.push({
          text: wrapLongText(text),
          style: 'paragraph'
        })
      }
    }

    if (token.type === 'table') {
      content.push(tableFromToken(token))
      return
    }

    if (token.type === 'hr') {
      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cbd5e1' }],
        margin: [0, 8, 0, 16]
      })
    }
  })

  return content
}

export const buildDocDefinition = (markdown) => {
  const title = getDocumentTitle(markdown)
  const tokens = marked.lexer(markdown, {
    gfm: true,
    breaks: false
  })

  return {
    info: {
      title,
      creator: 'PDFiTT'
    },
    pageSize: 'LETTER',
    pageMargins: [54, 56, 54, 56],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      color: '#1e293b',
      lineHeight: 1.45
    },
    content: blockFromTokens(tokens),
    styles: {
      h1: {
        fontSize: 25,
        bold: true,
        color: '#0f172a',
        margin: [0, 0, 0, 14]
      },
      h2: {
        fontSize: 17,
        bold: true,
        color: '#0f172a',
        margin: [0, 16, 0, 8]
      },
      h3: {
        fontSize: 14,
        bold: true,
        color: '#111827',
        margin: [0, 12, 0, 6]
      },
      h4: {
        fontSize: 12,
        bold: true,
        color: '#111827',
        margin: [0, 10, 0, 6]
      },
      paragraph: {
        margin: [0, 0, 0, 10]
      },
      listItem: {
        margin: [0, 0, 0, 4]
      },
      codeBlock: {
        fontSize: 9,
        color: '#0f172a'
      },
      inlineCode: {
        fontSize: 9,
        background: '#e2e8f0',
        color: '#111827'
      },
      tableHeader: {
        bold: true,
        color: '#0f172a'
      },
      tableCell: {
        color: '#334155'
      }
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: title, alignment: 'left', margin: [54, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 0, 54, 0] }
      ],
      fontSize: 8,
      color: '#64748b'
    })
  }
}

export const validateMarkdown = (markdown) => {
  if (typeof markdown !== 'string') {
    throw new Error('Markdown must be a string.')
  }

  if (!cleanText(markdown)) {
    throw new Error('Markdown cannot be empty.')
  }

  if (markdown.length > MAX_MARKDOWN_LENGTH) {
    throw new Error(`Markdown is too large. Limit input to ${MAX_MARKDOWN_LENGTH.toLocaleString()} characters.`)
  }
}
