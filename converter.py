#!/usr/bin/env python3
"""
Markdown to PDF Converter using LaTeX
Converts Markdown files to PDF using pandoc with LaTeX backend for superior typography.
"""

import os
import sys
import subprocess
import tempfile
import argparse
from pathlib import Path


class MarkdownToPDFConverter:
    def __init__(self):
        self.pandoc_options = [
            '--pdf-engine=pdflatex',
            '--variable', 'geometry:margin=1in',
            '--variable', 'fontsize=11pt',
            '--variable', 'documentclass=article',
            '--variable', 'colorlinks=true',
            '--variable', 'linkcolor=blue',
            '--variable', 'urlcolor=blue',
            '--variable', 'citecolor=blue',
            '--highlight-style=tango',
            '--table-of-contents',
            '--number-sections',
            '--standalone'
        ]
    
    def check_dependencies(self):
        """Check if required dependencies are available."""
        try:
            # Check pandoc
            result = subprocess.run(['pandoc', '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"✓ Pandoc found: {result.stdout.split()[1]}")
            
            # Check pdflatex
            result = subprocess.run(['pdflatex', '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"✓ pdfLaTeX found: TeX Live installation detected")
            
            return True
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"✗ Missing dependency: {e}")
            print("Please install pandoc and a LaTeX distribution (like TeX Live)")
            return False
    
    def convert_markdown_to_pdf(self, markdown_file, output_file=None, custom_options=None, base_options=None):
        """
        Convert a Markdown file to PDF using pandoc with LaTeX backend.
        
        Args:
            markdown_file (str): Path to the input Markdown file
            output_file (str): Path to the output PDF file (optional)
            custom_options (list): Additional pandoc options (optional)
            base_options (list): Base pandoc options to use instead of defaults (optional)
        
        Returns:
            str: Path to the generated PDF file
        """
        # Validate input file
        if not os.path.exists(markdown_file):
            raise FileNotFoundError(f"Markdown file not found: {markdown_file}")
        
        # Determine output file path
        if output_file is None:
            base_name = os.path.splitext(os.path.basename(markdown_file))[0]
            output_file = f"{base_name}.pdf"
        
        # Prepare pandoc command
        cmd = ['pandoc', markdown_file]
        
        # Use provided base options or default options
        if base_options is not None:
            cmd.extend(base_options)
        else:
            cmd.extend(self.pandoc_options)
        
        # Add custom options if provided
        if custom_options:
            cmd.extend(custom_options)
        
        cmd.extend(['-o', output_file])
        
        try:
            print(f"Converting {markdown_file} to {output_file}...")
            print(f"Command: {' '.join(cmd)}")
            
            # Run pandoc conversion
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            print(f"✓ Successfully converted to: {output_file}")
            return output_file
            
        except subprocess.CalledProcessError as e:
            print(f"✗ Conversion failed: {e}")
            if e.stderr:
                print(f"Error details: {e.stderr}")
            raise
    
    def convert_with_template(self, markdown_file, output_file=None, template_options=None):
        """
        Convert with additional LaTeX template customization.
        
        Args:
            markdown_file (str): Path to the input Markdown file
            output_file (str): Path to the output PDF file
            template_options (dict): LaTeX template variables
        """
        # Create a copy of default options and override with template options
        pandoc_options = self.pandoc_options.copy()
        
        if template_options:
            # Remove default values that will be overridden
            override_keys = set()
            for key in template_options.keys():
                override_keys.add(key.split(':')[0])  # Handle geometry:margin format
            
            # Filter out default options that will be overridden
            filtered_options = []
            i = 0
            while i < len(pandoc_options):
                if pandoc_options[i] == '--variable' and i + 1 < len(pandoc_options):
                    var_key = pandoc_options[i + 1].split('=')[0].split(':')[0]
                    if var_key not in override_keys:
                        filtered_options.extend([pandoc_options[i], pandoc_options[i + 1]])
                    i += 2
                else:
                    filtered_options.append(pandoc_options[i])
                    i += 1
            
            # Add custom template options
            custom_options = []
            for key, value in template_options.items():
                custom_options.extend(['--variable', f'{key}={value}'])
            
            # Use filtered options as base and add custom options
            return self.convert_markdown_to_pdf(markdown_file, output_file, custom_options, filtered_options)
        
        return self.convert_markdown_to_pdf(markdown_file, output_file)
    
    def batch_convert(self, input_directory, output_directory=None):
        """
        Convert all Markdown files in a directory to PDF.
        
        Args:
            input_directory (str): Directory containing Markdown files
            output_directory (str): Directory for output PDF files (optional)
        """
        input_path = Path(input_directory)
        if not input_path.exists():
            raise FileNotFoundError(f"Input directory not found: {input_directory}")
        
        if output_directory:
            output_path = Path(output_directory)
            output_path.mkdir(parents=True, exist_ok=True)
        else:
            output_path = input_path
        
        markdown_files = list(input_path.glob("*.md")) + list(input_path.glob("*.markdown"))
        
        if not markdown_files:
            print(f"No Markdown files found in {input_directory}")
            return
        
        print(f"Found {len(markdown_files)} Markdown files")
        
        for md_file in markdown_files:
            try:
                output_file = output_path / f"{md_file.stem}.pdf"
                self.convert_markdown_to_pdf(str(md_file), str(output_file))
            except Exception as e:
                print(f"Failed to convert {md_file}: {e}")


def main():
    parser = argparse.ArgumentParser(description='Convert Markdown to PDF using LaTeX')
    parser.add_argument('input', help='Input Markdown file or directory')
    parser.add_argument('-o', '--output', help='Output PDF file or directory')
    parser.add_argument('--batch', action='store_true', help='Batch convert directory')
    parser.add_argument('--template', help='Custom LaTeX template variables (key=value,key=value)')
    
    args = parser.parse_args()
    
    converter = MarkdownToPDFConverter()
    
    # Check dependencies
    if not converter.check_dependencies():
        sys.exit(1)
    
    try:
        if args.batch:
            converter.batch_convert(args.input, args.output)
        else:
            template_options = {}
            if args.template:
                for pair in args.template.split(','):
                    key, value = pair.split('=', 1)
                    template_options[key.strip()] = value.strip()
            
            if template_options:
                converter.convert_with_template(args.input, args.output, template_options)
            else:
                converter.convert_markdown_to_pdf(args.input, args.output)
                
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
