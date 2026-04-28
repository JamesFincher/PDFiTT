import { useMemo, useState } from 'react'
import { marked } from 'marked'
import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

if (typeof window !== 'undefined') {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  }
}

marked.setOptions({
  gfm: true,
  breaks: true
})

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

const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim()
const todayLabel = new Date().toISOString().slice(0, 10)

const inlineFromTokens = (tokens = []) => {
  if (!tokens.length) return ''

  return tokens.flatMap((token) => {
    switch (token.type) {
      case 'text':
      case 'escape':
        return { text: token.text || token.raw || '' }
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
        return { text: token.text || token.raw || '' }
    }
  })
}

const tableFromToken = (token) => {
  const headerCells = token.header.map((cell) => ({
    text: cleanText(cell.text),
    style: 'tableHeader'
  }))

  const bodyRows = token.rows.map((row) =>
    row.map((cell) => ({
      text: cleanText(cell.text),
      style: 'tableCell'
    }))
  )

  return {
    table: {
      headerRows: 1,
      widths: Array(token.header.length).fill('*'),
      body: [headerCells, ...bodyRows]
    },
    layout: {
      fillColor: (rowIndex) => (rowIndex === 0 ? '#edf2ff' : null),
      hLineColor: () => '#c9d6f5',
      vLineColor: () => '#c9d6f5',
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
          stack.push({ text: cleanText(child.text), style: 'listItem' })
        }
      } else if (child.type === 'space') {
        return
      } else {
        stack.push(...blockFromTokens([child]))
      }
    })

    if (stack.length === 1) {
      return stack[0]
    }

    return {
      stack,
      margin: [0, 2, 0, 4]
    }
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

    if (token.type === 'space') {
      return
    }

    if (token.type === 'list') {
      content.push(listFromToken(token))
      return
    }

    if (token.type === 'blockquote') {
      const quoteStack = blockFromTokens(token.tokens)

      content.push({
        table: {
          widths: [4, '*'],
          body: [[{ text: '' }, { stack: quoteStack, color: '#334155' }]]
        },
        layout: {
          fillColor: () => '#f8fafc',
          hLineWidth: () => 0,
          vLineWidth: (index) => (index === 1 ? 2 : 0),
          vLineColor: () => '#93a4c7',
          paddingLeft: (index) => (index === 1 ? 10 : 0),
          paddingRight: () => 0,
          paddingTop: () => 8,
          paddingBottom: () => 8
        },
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

const buildDocDefinition = (markdown) => {
  const tokens = marked.lexer(markdown, {
    gfm: true,
    breaks: false
  })

  return {
    info: {
      title: 'PDFiTT Document',
      creator: 'PDFiTT'
    },
    pageSize: 'LETTER',
    pageMargins: [54, 56, 54, 56],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      color: '#1f2937',
      lineHeight: 1.45
    },
    header: (currentPage) =>
      currentPage === 1
        ? null
        : {
            text: `PDFiTT Executive Document • ${todayLabel}`,
            alignment: 'right',
            margin: [0, 24, 54, 0],
            fontSize: 8,
            color: '#94a3b8'
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
        color: '#1e293b'
      },
      tableCell: {
        color: '#334155'
      }
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'Confidential • Internal Use Only', alignment: 'left', margin: [54, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 0, 54, 0] }
      ],
      fontSize: 8,
      color: '#64748b'
    })
  }
}

function App() {
  const [text, setText] = useState(STARTER_CONTENT)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('editor')

  const preview = useMemo(
    () => marked.parse(text),
    [text]
  )

  const handleDownload = async () => {
    if (isGenerating) return

    setIsGenerating(true)

    try {
      const docDefinition = buildDocDefinition(text)
      pdfMake.createPdf(docDefinition).download('executive-brief.pdf')
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Could not generate PDF. Please review markdown syntax and retry.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif] text-[#213547] antialiased">
      <div className="w-[95%] md:w-[90%] max-w-6xl h-[90vh] flex flex-col">
        <header className="text-center mb-4 md:mb-6">
          <h1 className="text-2xl md:text-[3.2em] leading-[1.1] font-bold text-primary-900 mb-2 md:mb-3 tracking-tight">
            PDFi<span className="text-primary-600">TT</span>
          </h1>
          <p className="text-base md:text-xl text-secondary-600">Executive-grade Markdown to PDF renderer</p>
        </header>

        <main className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex lg:hidden justify-center border-b border-secondary-200 mb-2 mx-auto w-full max-w-[300px]">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-8 py-2 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'editor' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-8 py-2 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'preview' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              View
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-3 md:gap-4 flex-1 min-h-0 overflow-hidden">
            <div className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col ${activeTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
              <div className="p-3 md:p-4 flex flex-col h-full">
                <h2 className="text-base md:text-lg font-semibold text-secondary-900 mb-2 md:mb-3 hidden lg:block">Markdown Source</h2>
                <div className="flex-1 relative">
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    className="absolute inset-0 w-full h-full p-2 md:p-3 bg-secondary-50/50 border border-secondary-200 rounded-md font-mono text-sm md:text-base resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-secondary-400"
                  />
                </div>
              </div>
            </div>

            <div className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
              <div className="p-3 md:p-4 flex flex-col h-full">
                <h2 className="text-base md:text-lg font-semibold text-secondary-900 mb-2 md:mb-3 hidden lg:block">Live Preview</h2>
                <div className="flex-1 relative">
                  <div className="absolute inset-0 overflow-auto bg-secondary-50/50 rounded-md border border-secondary-200 p-3">
                    <div
                      className="prose prose-sm md:prose max-w-none pb-16 prose-headings:text-secondary-900 prose-p:text-secondary-700 prose-a:text-[#0b4dbb]"
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 left-0 right-0 py-2 bg-gradient-to-t from-white via-white to-transparent">
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="px-6 py-2.5 bg-[#0f172a] text-white text-sm md:text-base font-medium rounded-md border border-transparent hover:border-[#0b4dbb] transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#0b4dbb] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Rendering PDF…' : 'Download Executive PDF'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
