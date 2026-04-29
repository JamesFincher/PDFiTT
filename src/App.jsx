import { useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import {
  Columns2,
  Download,
  Eye,
  FileText,
  Loader2,
  PencilLine,
  RotateCcw,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import { marked } from 'marked'

const STARTER_CONTENT = `# Q2 Strategy Briefing

## Executive Summary
Our customer base expanded by **18% QoQ**, while average contract value increased by **7%**. The strongest momentum came from enterprise renewals and cross-sell performance in regulated industries.

## Key Decisions Requested
1. Approve a \`$1.2M\` expansion budget for enterprise onboarding automation.
2. Prioritize healthcare and financial services enablement for H2 launches.
3. Maintain hiring plan focused on platform reliability and implementation partners.

## Performance Snapshot
| KPI | Q1 | Q2 | Change |
| --- | ---: | ---: | ---: |
| Net Revenue Retention | 111% | 116% | +5pp |
| Churn | 4.1% | 3.3% | -0.8pp |
| Average Deal Cycle | 49 days | 43 days | -6 days |

> Recommendation: Shift 15% of demand-gen spend from broad awareness to account-based programs targeting top 200 enterprise accounts.

### Risks & Mitigation
- **Implementation delay risk** in two strategic accounts.
- Vendor concentration for analytics infrastructure.
- Change fatigue in customer success teams.

Mitigation includes phased rollouts, a dual-vendor observability model, and quarterly enablement refresh cycles.
`

const CLASSIFICATION_OPTIONS = ['Confidential', 'Internal Use Only', 'Board Draft', 'Public']

const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim()

const sanitizeFileName = (value) =>
  cleanText(value || 'executive-brief')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'executive-brief'

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
          color: '#0b4dbb',
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
      fillColor: (rowIndex) => (rowIndex === 0 ? '#ecfdf5' : null),
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
        if (child.tokens?.length) {
          stack.push({ text: inlineFromTokens(child.tokens), style: 'listItem' })
        } else {
          stack.push({ text: child.text, style: 'listItem' })
        }
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
            { text: '', fillColor: '#0f766e', border: [false, false, false, false] },
            { stack: blockFromTokens(token.tokens), border: [false, false, false, false], margin: [10, 6, 0, 0] }
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
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#d3dce9' }],
        margin: [0, 8, 0, 16]
      })
    }
  })

  return content
}

const buildDocDefinition = (markdown, options) => {
  const tokens = marked.lexer(markdown, {
    gfm: true,
    breaks: false
  })

  return {
    info: {
      title: options.documentTitle,
      creator: 'PDFiTT'
    },
    pageSize: options.pageSize,
    pageMargins: [54, 58, 54, 58],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      color: '#1f2937',
      lineHeight: 1.45
    },
    content: blockFromTokens(tokens),
    styles: {
      h1: {
        fontSize: 24,
        bold: true,
        color: '#0f172a',
        margin: [0, 0, 0, 12]
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
        background: '#f3f4f6',
        margin: [0, 6, 0, 14],
        color: '#0f172a'
      },
      inlineCode: {
        fontSize: 9,
        background: '#e5e7eb',
        color: '#111827'
      },
      tableHeader: {
        bold: true,
        color: '#134e4a'
      },
      tableCell: {
        color: '#334155'
      }
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `${options.classification} - ${options.documentTitle}`, alignment: 'left', margin: [54, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 0, 54, 0] }
      ],
      fontSize: 8,
      color: '#64748b'
    })
  }
}

const getDocumentStats = (markdown) => {
  const tokens = marked.lexer(markdown, { gfm: true })
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_[\]()`|:-]/g, ' ')
  const words = cleanText(plainText).split(/\s+/).filter(Boolean)
  const headings = tokens.filter((token) => token.type === 'heading')
  const tables = tokens.filter((token) => token.type === 'table')
  const decisionCues = markdown.match(/\b(approve|decision|decisions requested|recommendation|risk|mitigation)\b/gi) || []
  const hasExecutiveSummary = headings.some((heading) => /executive summary/i.test(heading.text))

  let readiness = 'Draft'
  if (words.length > 80 && hasExecutiveSummary && decisionCues.length >= 3) {
    readiness = 'Board-ready'
  } else if (!hasExecutiveSummary) {
    readiness = 'Needs summary'
  } else if (decisionCues.length < 2) {
    readiness = 'Needs decision framing'
  }

  return {
    wordCount: words.length,
    readMinutes: Math.max(1, Math.ceil(words.length / 200)),
    sectionCount: headings.length,
    tableCount: tables.length,
    decisionCueCount: decisionCues.length,
    readiness
  }
}

function App() {
  const [text, setText] = useState(STARTER_CONTENT)
  const [documentTitle, setDocumentTitle] = useState('Q2 Strategy Briefing')
  const [fileName, setFileName] = useState('executive-brief')
  const [classification, setClassification] = useState(CLASSIFICATION_OPTIONS[0])
  const [pageSize, setPageSize] = useState('LETTER')
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

  const stats = useMemo(() => getDocumentStats(text), [text])

  const handleDownload = async () => {
    if (isGenerating || !cleanText(text)) return

    setIsGenerating(true)

    try {
      const pdfMake = await loadPdfMake()
      const docDefinition = buildDocDefinition(text, {
        documentTitle: cleanText(documentTitle) || 'PDFiTT Document',
        classification,
        pageSize
      })
      pdfMake.createPdf(docDefinition).download(`${sanitizeFileName(fileName || documentTitle)}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Could not generate PDF. Please review markdown syntax and retry.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setText(STARTER_CONTENT)
    setDocumentTitle('Q2 Strategy Briefing')
    setFileName('executive-brief')
    setClassification(CLASSIFICATION_OPTIONS[0])
    setPageSize('LETTER')
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900 antialiased">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              PDFiTT
            </div>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
              Executive PDF Workspace
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              title="Restore sample briefing"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-600 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => setText('')}
              title="Clear markdown"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-rose-500 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || !cleanText(text)}
              title="Download PDF"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
              {isGenerating ? 'Rendering' : 'Download PDF'}
            </button>
          </div>
        </header>

        <section className="grid gap-3 border-b border-slate-200 py-4 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr]">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Document title</span>
            <input
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">File name</span>
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Classification</span>
            <select
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {CLASSIFICATION_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Page size</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="LETTER">Letter</option>
              <option value="A4">A4</option>
              <option value="LEGAL">Legal</option>
            </select>
          </label>
        </section>

        <section className="grid gap-2 py-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Readiness', stats.readiness],
            ['Words', stats.wordCount.toLocaleString()],
            ['Read time', `${stats.readMinutes} min`],
            ['Sections', stats.sectionCount.toLocaleString()],
            ['Decision cues', stats.decisionCueCount.toLocaleString()]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <main className="flex min-h-0 flex-1 flex-col gap-3">
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

          <div className="grid min-h-[620px] flex-1 gap-4 lg:grid-cols-2">
            <section className={`min-h-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${activeTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex h-full min-h-[620px] flex-col">
                <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileText aria-hidden="true" className="h-4 w-4 text-teal-700" />
                    Markdown Source
                  </div>
                  <div className="text-xs font-medium text-slate-500">{stats.tableCount} tables</div>
                </div>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  aria-label="Markdown source"
                  spellCheck="true"
                  className="min-h-0 flex-1 resize-none border-0 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600"
                  placeholder="# Executive Summary"
                />
              </div>
            </section>

            <section className={`min-h-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex h-full min-h-[620px] flex-col">
                <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Columns2 aria-hidden="true" className="h-4 w-4 text-teal-700" />
                    Executive Preview
                  </div>
                  <div className="text-xs font-medium text-slate-500">{classification}</div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-white p-5">
                  <article
                    className="prose prose-sm max-w-none prose-slate prose-headings:text-slate-950 prose-a:text-teal-700 prose-blockquote:border-teal-700 prose-code:text-teal-800"
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
