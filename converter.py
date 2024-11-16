import markdown2
import pdfkit
import argparse
import os

def convert_markdown_to_pdf(input_file, output_file=None):
    """
    Convert a Markdown file to PDF, preserving formatting by converting through HTML.
    
    Args:
        input_file (str): Path to the input Markdown file
        output_file (str, optional): Path to the output PDF file. If not provided,
                                   will use the input filename with .pdf extension
    """
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Input file not found: {input_file}")
    
    # If no output file is specified, use the input filename with .pdf extension
    if output_file is None:
        output_file = os.path.splitext(input_file)[0] + '.pdf'
    
    # Read the markdown content
    with open(input_file, 'r', encoding='utf-8') as f:
        markdown_content = f.read()
    
    # Convert markdown to HTML
    html_content = markdown2.markdown(
        markdown_content,
        extras=['fenced-code-blocks', 'tables', 'header-ids']
    )
    
    # Add some basic CSS for better formatting
    html_content = f"""
    <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 40px;
                }}
                code {{
                    background-color: #f4f4f4;
                    padding: 2px 4px;
                    border-radius: 4px;
                }}
                pre {{
                    background-color: #f4f4f4;
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                }}
                table {{
                    border-collapse: collapse;
                    width: 100%;
                    margin: 20px 0;
                }}
                th, td {{
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }}
                th {{
                    background-color: #f4f4f4;
                }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
    </html>
    """
    
    # Convert HTML to PDF
    pdfkit.from_string(html_content, output_file)
    print(f"Successfully converted {input_file} to {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Convert Markdown to PDF with preserved formatting')
    parser.add_argument('input_file', help='Path to the input Markdown file')
    parser.add_argument('-o', '--output', help='Path to the output PDF file (optional)')
    
    args = parser.parse_args()
    convert_markdown_to_pdf(args.input_file, args.output)

if __name__ == '__main__':
    main()
