/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#334155',
            h1: {
              color: '#0c4a6e',
            },
            h2: {
              color: '#0c4a6e',
            },
            h3: {
              color: '#0c4a6e',
            },
            h4: {
              color: '#0c4a6e',
            },
            a: {
              color: '#0284c7',
              '&:hover': {
                color: '#0369a1',
              },
            },
            pre: {
              backgroundColor: '#f8fafc',
              color: '#334155',
            },
            code: {
              color: '#0c4a6e',
              '&::before': {
                content: '""',
              },
              '&::after': {
                content: '""',
              },
            },
            blockquote: {
              color: '#64748b',
              borderLeftColor: '#e2e8f0',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
