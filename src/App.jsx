import { useState, useEffect } from 'react'
import { marked } from 'marked'
import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

// Initialize pdfMake with fonts
if (typeof window !== 'undefined') {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;
  pdfMake.fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    },
    Courier: {
      normal: 'Courier',
      bold: 'Courier-Bold',
      italics: 'Courier-Oblique',
      bolditalics: 'Courier-BoldOblique'
    },
    Times: {
      normal: 'Times-Roman',
      bold: 'Times-Bold',
      italics: 'Times-Italic',
      bolditalics: 'Times-BoldItalic'
    }
  };
}

function App() {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('editor') // 'editor' or 'preview'

  const convertMarkdownToPdfContent = (markdown) => {
    const lines = markdown.split('\n')
    const content = []
    let listItems = []
    let inCodeBlock = false
    let codeContent = ''
    let isFirstHeader = true

    const flushListItems = () => {
      if (listItems.length > 0) {
        content.push({
          ul: listItems.map(item => ({
            text: item,
            style: 'listItem'
          }))
        })
        listItems = []
      }
    }

    const processInlineElements = (text) => {
      let parts = []
      let currentText = ''
      let index = 0

      while (index < text.length) {
        // Bold
        if (text.slice(index).match(/^\*\*([^*]+)\*\*/)) {
          const match = text.slice(index).match(/^\*\*([^*]+)\*\*/)
          if (currentText) {
            parts.push({ text: currentText })
            currentText = ''
          }
          parts.push({ text: match[1], bold: true })
          index += match[0].length
          continue
        }

        // Italic
        if (text.slice(index).match(/^\*([^*]+)\*/)) {
          const match = text.slice(index).match(/^\*([^*]+)\*/)
          if (currentText) {
            parts.push({ text: currentText })
            currentText = ''
          }
          parts.push({ text: match[1], italics: true })
          index += match[0].length
          continue
        }

        // Inline code
        if (text.slice(index).match(/^`([^`]+)`/)) {
          const match = text.slice(index).match(/^`([^`]+)`/)
          if (currentText) {
            parts.push({ text: currentText })
            currentText = ''
          }
          parts.push({ text: match[1], style: 'code' })
          index += match[0].length
          continue
        }

        // Links
        if (text.slice(index).match(/^\[([^\]]+)\]\(([^)]+)\)/)) {
          const match = text.slice(index).match(/^\[([^\]]+)\]\(([^)]+)\)/)
          if (currentText) {
            parts.push({ text: currentText })
            currentText = ''
          }
          parts.push({ text: match[1], link: match[2], style: 'link' })
          index += match[0].length
          continue
        }

        currentText += text[index]
        index++
      }

      if (currentText) {
        parts.push({ text: currentText })
      }

      return parts.length > 1 ? parts : text
    }

    for (let line of lines) {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          content.push({
            text: codeContent.trim(),
            style: 'codeBlock',
            margin: [10, 5, 10, 15]
          })
          codeContent = ''
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeContent += line + '\n'
        continue
      }

      // Headers
      const headerMatch = line.match(/^(#{1,6})\s(.+)/)
      if (headerMatch) {
        flushListItems()
        const level = headerMatch[1].length
        content.push({
          text: processInlineElements(headerMatch[2]),
          style: `h${level}`,
          pageBreak: (level === 1 && !isFirstHeader) ? 'before' : undefined
        })
        if (isFirstHeader) {
          isFirstHeader = false
        }
        continue
      }

      // Blockquotes
      if (line.startsWith('>')) {
        flushListItems()
        content.push({
          text: processInlineElements(line.substring(1).trim()),
          style: 'blockquote'
        })
        continue
      }

      // Lists
      if (line.match(/^[\*\-\+]\s/)) {
        const text = line.replace(/^[\*\-\+]\s/, '').trim()
        listItems.push(processInlineElements(text))
        continue
      }

      // Numbered lists
      const numberedListMatch = line.match(/^\d+\.\s(.+)/)
      if (numberedListMatch) {
        flushListItems()
        content.push({
          ol: [{ text: processInlineElements(numberedListMatch[1]), style: 'listItem' }]
        })
        continue
      }

      // Regular paragraph
      if (line.trim()) {
        flushListItems()
        content.push({
          text: processInlineElements(line.trim()),
          style: 'paragraph'
        })
      }
    }

    flushListItems()
    return content
  }

  // Auto-update preview when text changes
  useEffect(() => {
    const htmlContent = marked(text, { 
      gfm: true,
      breaks: true,
      smartLists: true
    })
    setPreview(htmlContent)
  }, [text])

  const handleDownload = async () => {
    if (isGenerating) return
    setIsGenerating(true)

    try {
      const pdfContent = convertMarkdownToPdfContent(text)
      const docDefinition = {
        pageSize: 'LETTER',
        pageMargins: [40, 40, 40, 40],
        defaultStyle: {
          font: 'Times',
          fontSize: 12,
          lineHeight: 1.4
        },
        styles: {
          h1: {
            font: 'Times',
            fontSize: 24,
            bold: true,
            marginBottom: 10,
            marginTop: 10
          },
          h2: {
            font: 'Times',
            fontSize: 20,
            bold: true,
            marginBottom: 8,
            marginTop: 16
          },
          h3: {
            font: 'Times',
            fontSize: 16,
            bold: true,
            marginBottom: 6,
            marginTop: 14
          },
          h4: {
            font: 'Times',
            fontSize: 14,
            bold: true,
            marginBottom: 4,
            marginTop: 12
          },
          h5: {
            font: 'Times',
            fontSize: 12,
            bold: true,
            marginBottom: 4,
            marginTop: 12
          },
          h6: {
            font: 'Times',
            fontSize: 12,
            bold: true,
            marginBottom: 4,
            marginTop: 12
          },
          paragraph: {
            font: 'Times',
            fontSize: 12,
            marginBottom: 10
          },
          code: {
            font: 'Courier',
            fontSize: 11,
            color: '#333'
          },
          codeBlock: {
            font: 'Courier',
            fontSize: 11,
            background: '#f8f8f8',
            padding: 8,
            marginBottom: 10,
            preserveLeadingSpaces: true
          },
          blockquote: {
            font: 'Times',
            fontSize: 12,
            italics: true,
            marginLeft: 30,
            marginRight: 30,
            marginTop: 10,
            marginBottom: 10,
            color: '#555'
          },
          link: {
            font: 'Times',
            fontSize: 12,
            color: '#0066cc',
            decoration: 'underline'
          },
          listItem: {
            font: 'Times',
            fontSize: 12,
            marginBottom: 5
          }
        },
        content: pdfContent
      }

      pdfMake.createPdf(docDefinition).download('document.pdf')
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary-50 via-white to-secondary-50 
                    flex items-center justify-center font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif]
                    text-[#213547] antialiased">
      <div className="w-[95%] md:w-[90%] max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <header className="text-center mb-4 md:mb-6">
          <h1 className="text-2xl md:text-[3.2em] leading-[1.1] font-bold text-primary-900 mb-2 md:mb-3 tracking-tight">
            PDFi<span className="text-primary-600">TT</span>
          </h1>
          <p className="text-base md:text-xl text-secondary-600">
            Transform your Markdown into beautifully formatted PDFs
          </p>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Mobile Tabs */}
          <div className="flex lg:hidden justify-center border-b border-secondary-200 mb-2 mx-auto w-full max-w-[300px]">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-8 py-2 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'editor'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Write
              </span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-8 py-2 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'preview'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-600 hover:text-secondary-900'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </span>
            </button>
          </div>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-2 gap-3 md:gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Editor Panel */}
            <div className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col
                          ${!activeTab || activeTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
              <div className="p-3 md:p-4 flex flex-col h-full">
                <h2 className="text-base md:text-lg font-semibold text-secondary-900 mb-2 md:mb-3 flex items-center hidden lg:flex">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Markdown Editor
                </h2>
                <div className="flex-1 relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="# Start writing your markdown here..."
                    className="absolute inset-0 w-full h-full p-2 md:p-3 bg-secondary-50/50 border border-secondary-200 rounded-md
                             font-mono text-sm md:text-base resize-none leading-relaxed
                             focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                             transition-colors duration-200
                             placeholder:text-secondary-400"
                  />
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col
                          ${!activeTab || activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
              <div className="p-3 md:p-4 flex flex-col h-full">
                <h2 className="text-base md:text-lg font-semibold text-secondary-900 mb-2 md:mb-3 flex items-center hidden lg:flex">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </h2>
                <div className="flex-1 relative">
                  <div className="absolute inset-0 overflow-auto bg-secondary-50/50 rounded-md border border-secondary-200 p-2 md:p-3">
                    {preview ? (
                      <div 
                        className="prose prose-sm md:prose max-w-none pb-16
                                 prose-headings:text-secondary-900 prose-headings:mb-2
                                 prose-p:text-secondary-700 prose-p:leading-relaxed prose-p:mb-2
                                 prose-a:text-[#646cff] prose-a:no-underline hover:prose-a:text-[#535bf2]
                                 prose-blockquote:text-secondary-600 prose-blockquote:border-secondary-300
                                 prose-code:text-secondary-800 prose-code:bg-secondary-100 
                                 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                                 prose-pre:bg-secondary-100 prose-pre:text-secondary-900 prose-pre:shadow-sm
                                 prose-ol:text-secondary-700 prose-ul:text-secondary-700
                                 prose-strong:text-secondary-900 prose-em:text-secondary-800"
                        dangerouslySetInnerHTML={{ __html: preview }}
                      />
                    ) : (
                      <div className="text-secondary-400 italic flex items-center justify-center h-full text-sm">
                        Start typing to see the preview...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download Button - Sticky Footer */}
          <div className="sticky bottom-0 left-0 right-0 py-2 bg-gradient-to-t from-white via-white to-transparent">
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="px-6 py-2.5 bg-[#1a1a1a] text-white text-sm md:text-base font-medium rounded-md
                         border border-transparent hover:border-[#646cff]
                         transition-all duration-200 cursor-pointer shadow-md
                         focus:outline-none focus:ring-2 focus:ring-[#646cff] focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed
                         dark:bg-[#f9f9f9] dark:text-[#213547]
                         w-[200px] md:w-auto"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Download PDF'
                )}
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto pt-2 pb-1 text-center text-secondary-500 text-xs">
          <p>
            Made with{' '}
            <span className="text-red-500" aria-label="love">
              ❤️
            </span>{' '}
            for markdown lovers
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
