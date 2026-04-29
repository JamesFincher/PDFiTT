import { useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { Download, Eye, FileText, Loader2, PencilLine, RotateCcw, Trash2 } from 'lucide-react'
import { marked } from 'marked'

const SAMPLE_MARKDOWN = `# Product Launch Notes

## Overview
PDFiTT turns Markdown into a clean PDF with headings, lists, tables, links, quotes, and code formatting preserved.

## Checklist
- Write or paste Markdown.
- Review the live preview.
- Download the finished PDF.

## Sample Table
| Item | Owner | Status |
| --- | --- | --- |
| Landing copy | Maya | Ready |
| Release notes | Sam | Draft |
| Support article | Lee | Ready |

> Keep the source simple. The PDF should look finished without extra formatting work.

\`\`\`js
const ready = markdown.trim().length > 0
\`\`\`
`

const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim()

const getDocumentTitle = (markdown) => {
  const heading = marked.lexer(markdown, { gfm: true }).find((token) => token.type === 'heading' && token.depth === 1)
  return cleanText(heading?.text) || 'PDFiTT Document'
}

const sanitizeFileName = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'pdfitt-document'

const getWordCount = (markdown) => {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_[\]()`|:-]/g, ' ')

  return cleanText(plainText).split(/\s+/).filter(Boolean).length
}

const loadPdfMake = async () => {
  const [{ default: pdfMake }, pdfFonts] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts')
  ])

  pdfMake.vfs =
    pdfFonts.pdfMake?.vfs ||
    pdfFonts.vfs ||
    pdfFonts.default?.pdfMake?.vfs ||
    pdfFonts.default?.vfs ||
    pdfFonts.default ||
    pdfFonts

  return pdfMake
}

const inlineFromTokens = (tokens = []) => {
  if (!tokens.length) return ''

  return tokens.flatMap((token) => {
    switch (token.type) {
      case 'text':
      case 'escape':
        if (token.tokens?.length) return inlineFromTokens(token.tokens)
        return { text: token.raw || token.text || '' }
      case 'strong':
        return { text: inlineFromTokens(token.tokens), bold: true }
      case 'em':
        return { text: inlineFromTokens(token.tokens), italics: true }
      case 'codespan':
        return { text: token.text || '', style: 'inlineCode' }
      case 'link':
        return {
          text: inlineFromTokens(token.tokens),
          link: token.href,
          color: '#2563eb',
          decoration: 'underline'
        }
      case 'del':
        return { text: inlineFromTokens(token.tokens), decoration: 'lineThrough' }
      case 'br':
        return '\n'
      default:
        return { text: token.raw || token.text || '' }
    }
  })
}

const tableFromToken = (token) => {
  const headerCells = token.header.map((cell) => ({
    text: cleanText(cell.text),
    style: 'tableHeader',
    alignment: cell.align || 'left'
  }))

  const bodyRows = token.rows.map((row) =>
    row.map((cell) => ({
      text: cleanText(cell.text),
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

    if (stack.length === 1) return stack[0]
    return { stack, margin: [0, 2, 0, 4] }
  })

  return {
    [token.ordered ? 'ol' : 'ul']: items,
    margin: [0, 4, 0, 12]
  }
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
        text: token.text || '',
        style: 'codeBlock'
      })
      return
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

const buildDocDefinition = (markdown) => {
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
        background: '#f8fafc',
        margin: [0, 6, 0, 14],
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

function App() {
  const [text, setText] = useState(SAMPLE_MARKDOWN)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('editor')

  const preview = useMemo(
    () =>
      DOMPurify.sanitize(
        marked.parse(text, {
          gfm: true,
          breaks: true
        }),
        { USE_PROFILES: { html: true } }
      ),
    [text]
  )

  const title = useMemo(() => getDocumentTitle(text), [text])
  const wordCount = useMemo(() => getWordCount(text), [text])
  const canDownload = cleanText(text).length > 0

  const handleDownload = async () => {
    if (isGenerating || !canDownload) return

    setIsGenerating(true)

    try {
      const pdfMake = await loadPdfMake()
      pdfMake.createPdf(buildDocDefinition(text)).download(`${sanitizeFileName(title)}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Could not generate PDF. Please review the Markdown and retry.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950 antialiased">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">PDFiTT</div>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">Markdown to PDF</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm sm:flex">
              {wordCount.toLocaleString()} words
            </div>
            <button
              type="button"
              onClick={() => setText(SAMPLE_MARKDOWN)}
              title="Restore sample"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-500 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => setText('')}
              title="Clear Markdown"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-rose-500 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || !canDownload}
              title="Download PDF"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
              {isGenerating ? 'Rendering' : 'Download PDF'}
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
          <div className="flex w-full rounded-md border border-slate-300 bg-white p-1 lg:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-medium ${
                activeTab === 'editor' ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <PencilLine aria-hidden="true" className="h-4 w-4" />
              Write
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-medium ${
                activeTab === 'preview' ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
              Preview
            </button>
          </div>

          <div className="grid min-h-[680px] flex-1 gap-4 lg:grid-cols-2">
            <section className={`min-h-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${activeTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex h-full min-h-[680px] flex-col">
                <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileText aria-hidden="true" className="h-4 w-4 text-blue-700" />
                    Markdown
                  </div>
                  <div className="text-xs font-medium text-slate-500 sm:hidden">{wordCount.toLocaleString()} words</div>
                </div>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  aria-label="Markdown"
                  spellCheck="true"
                  className="min-h-0 flex-1 resize-none border-0 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600"
                  placeholder="# Untitled"
                />
              </div>
            </section>

            <section className={`min-h-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex h-full min-h-[680px] flex-col">
                <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Eye aria-hidden="true" className="h-4 w-4 text-blue-700" />
                    Preview
                  </div>
                  <div className="max-w-[60%] truncate text-xs font-medium text-slate-500">{title}</div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-white p-5 sm:p-7">
                  <article
                    className="prose prose-sm max-w-none prose-slate prose-headings:text-slate-950 prose-a:text-blue-700 prose-blockquote:border-slate-500 prose-code:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: preview }}
                  />
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
