# Markdown to PDF Converter (LaTeX-based)

A high-quality Markdown to PDF converter using pandoc with LaTeX backend for superior typography and formatting.

## Features

- **Superior Typography**: Uses LaTeX for professional document formatting
- **Rich Markdown Support**: Handles tables, code blocks, lists, links, and more
- **Customizable Templates**: Flexible LaTeX template variable system
- **Batch Processing**: Convert multiple files at once
- **Table of Contents**: Automatic generation with section numbering
- **Syntax Highlighting**: Beautiful code syntax highlighting
- **Cross-references**: Proper handling of links and references

## Requirements

### System Dependencies
- **pandoc** (3.1+ recommended) - Document converter
- **pdflatex** (from TeX Live distribution) - LaTeX processor

Both are pre-installed in this environment.

### Python Dependencies
No additional Python packages required - the converter uses pandoc directly via subprocess calls.

## Usage

### Basic Conversion
```bash
python3 converter.py input.md -o output.pdf
```

### Batch Conversion
Convert all Markdown files in a directory:
```bash
python3 converter.py input_directory --batch -o output_directory
```

### Custom Template Variables
Customize LaTeX formatting with template variables:
```bash
python3 converter.py input.md -o output.pdf --template "fontsize=12pt,geometry=margin=0.75in,documentclass=report"
```

## Default LaTeX Settings

The converter uses these default LaTeX settings:
- **PDF Engine**: pdflatex
- **Margins**: 1 inch on all sides
- **Font Size**: 11pt
- **Document Class**: article
- **Links**: Colored blue with clickable URLs
- **Code Highlighting**: Tango style
- **Features**: Table of contents, numbered sections

## Template Customization

You can override any LaTeX variable using the `--template` option. Common variables include:

- `fontsize`: Font size (10pt, 11pt, 12pt, etc.)
- `geometry`: Page margins (e.g., `margin=0.75in`, `top=1in,bottom=1in,left=1.25in,right=1.25in`)
- `documentclass`: Document class (article, report, book, etc.)
- `fontfamily`: Font family (times, palatino, etc.)
- `linestretch`: Line spacing multiplier
- `papersize`: Paper size (a4paper, letterpaper, etc.)

### Example Template Customizations

**Academic Paper Style:**
```bash
python3 converter.py paper.md -o paper.pdf --template "documentclass=article,fontsize=12pt,geometry=margin=1in,linestretch=2"
```

**Report Style:**
```bash
python3 converter.py report.md -o report.pdf --template "documentclass=report,fontsize=11pt,geometry=top=1in,bottom=1in,left=1.25in,right=1.25in"
```

**Compact Style:**
```bash
python3 converter.py doc.md -o doc.pdf --template "fontsize=10pt,geometry=margin=0.5in"
```

## Supported Markdown Features

- **Headers** (H1-H6) with automatic numbering
- **Text formatting** (bold, italic, strikethrough)
- **Lists** (ordered and unordered, nested)
- **Tables** with proper LaTeX formatting
- **Code blocks** with syntax highlighting
- **Inline code** with proper formatting
- **Links** (internal and external)
- **Images** (with proper scaling)
- **Blockquotes**
- **Horizontal rules**
- **Math expressions** (LaTeX math)

## Advantages over HTML-based Conversion

1. **Better Typography**: LaTeX produces publication-quality typography
2. **Proper Page Breaks**: Intelligent page breaking for long documents
3. **Mathematical Expressions**: Native LaTeX math support
4. **Professional Tables**: Better table formatting and page breaks
5. **Bibliography Support**: Can integrate with LaTeX bibliography systems
6. **Consistent Fonts**: Professional font handling and spacing
7. **Print-Ready Output**: Optimized for both screen and print

## Command Line Options

```
usage: converter.py [-h] [-o OUTPUT] [--batch] [--template TEMPLATE] input

Convert Markdown to PDF using LaTeX

positional arguments:
  input                Input Markdown file or directory

options:
  -h, --help           show this help message and exit
  -o, --output OUTPUT  Output PDF file or directory
  --batch              Batch convert directory
  --template TEMPLATE  Custom LaTeX template variables (key=value,key=value)
```

## Examples

### Single File Conversion
```bash
# Basic conversion
python3 converter.py document.md

# Custom output name
python3 converter.py document.md -o my_document.pdf

# Custom formatting
python3 converter.py document.md -o formatted.pdf --template "fontsize=12pt,documentclass=report"
```

### Batch Conversion
```bash
# Convert all .md files in current directory
python3 converter.py . --batch

# Convert with custom output directory
python3 converter.py markdown_files --batch -o pdf_output

# Batch convert with custom formatting
python3 converter.py docs --batch -o formatted_docs --template "fontsize=11pt,geometry=margin=0.75in"
```

## File Structure

```
.
├── converter.py          # Main converter script
├── requirements.txt      # Dependencies documentation
├── sample.md            # Sample Markdown file
├── README.md            # This documentation
└── *.pdf               # Generated PDF files
```

## Troubleshooting

### Common Issues

1. **Missing pandoc**: Install pandoc from https://pandoc.org/installing.html
2. **Missing LaTeX**: Install TeX Live or MiKTeX
3. **LaTeX compilation errors**: Check template variables for typos
4. **Font issues**: Ensure specified fonts are installed in your LaTeX distribution

### Getting Help

Use the `--help` flag to see all available options:
```bash
python3 converter.py --help
```

## Migration from HTML-based Converter

If you're migrating from an HTML-based converter:

1. **No Python dependencies needed**: Remove `markdown2` and `pdfkit` from your environment
2. **Better output quality**: LaTeX produces superior typography
3. **More customization options**: Extensive LaTeX template system
4. **Batch processing**: Built-in support for converting multiple files
5. **Professional features**: Table of contents, section numbering, better page breaks

The new converter provides all the functionality of the previous HTML-based version with significant improvements in output quality and customization options.
