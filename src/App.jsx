import { useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { Download, Eye, FileText, Loader2, PencilLine, RotateCcw, Trash2 } from 'lucide-react'
import { marked } from 'marked'
import { buildDocDefinition, cleanText, getDocumentTitle, getWordCount, sanitizeFileName } from './lib/markdownPdf'

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
