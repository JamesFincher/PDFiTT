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
      <div className="w-[90%] max-w-6xl h-[90vh] flex flex-col justify-center">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-[3.2em] leading-[1.1] font-bold text-primary-900 mb-3 tracking-tight">
            PDFi<span className="text-primary-600">TT</span>
          </h1>
          <p className="text-xl text-secondary-600">
            Transform your Markdown into beautifully formatted PDFs in seconds
          </p>
        </header>

        {/* Main Content */}
        <main className="flex-1 grid lg:grid-cols-2 gap-6 min-h-0">
          {/* Editor Panel */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary-900">
                  Markdown Editor
                </h2>
                <div>
                  <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="px-[0.6em] py-[1.2em] bg-[#1a1a1a] text-white text-base font-medium rounded-lg
                             border border-transparent hover:border-[#646cff]
                             transition-all duration-200 cursor-pointer
                             focus:outline-[4px] focus:outline-[#646cff] focus:outline-offset-[-1px]
                             disabled:opacity-50 disabled:cursor-not-allowed
                             dark:bg-[#f9f9f9] dark:text-[#213547]"
                  >
                    {isGenerating ? 'Generating PDF...' : 'Download PDF'}
                  </button>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="# Start writing your markdown here...

## Example formatting:
- Use **bold** for emphasis
- Create *italic* text
- Add `inline code`
- Insert [links](https://example.com)

```python
def hello():
    print('Hello, World!')
```"
                className="flex-1 w-full p-4 bg-secondary-50 border border-secondary-200 rounded-lg 
                         font-mono text-base resize-none 
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         transition-colors duration-200
                         placeholder:text-secondary-400"
              />
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col h-full">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Live Preview
              </h2>
              <div className="flex-1 overflow-auto">
                {preview ? (
                  <div 
                    className="prose prose-slate max-w-none
                             prose-headings:text-secondary-900
                             prose-p:text-secondary-700
                             prose-a:text-[#646cff] prose-a:no-underline hover:prose-a:text-[#535bf2]
                             prose-blockquote:text-secondary-600 prose-blockquote:border-secondary-300
                             prose-code:text-secondary-800 prose-code:bg-secondary-100 
                             prose-code:px-1 prose-code:rounded
                             prose-pre:bg-secondary-50 prose-pre:text-secondary-900
                             prose-ol:text-secondary-700 prose-ul:text-secondary-700
                             prose-strong:text-secondary-900 prose-em:text-secondary-800
                             dark:prose-a:hover:text-[#747bff]"
                    dangerouslySetInnerHTML={{ __html: preview }}
                  />
                ) : (
                  <div className="text-secondary-400 italic">
                    Start typing to see the preview...
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center text-secondary-500 text-sm mt-8">
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
