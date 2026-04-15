/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f6f8f6',
          100: '#eef3ef',
          200: '#dce5dd',
          300: '#bfcbbb',
          400: '#9cb59b',
          500: '#759972',
          600: '#5a7a58',
          700: '#486246',
          800: '#3a4e39',
          900: '#304030', // Deep sophisticated Emerald/Olive
        },
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b', // Slate/Zinc
        }
      },
      fontFamily: {
        sans: ['Inter', 'Cairo', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
        ar: ['Cairo', 'Noto Sans Arabic', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'float': '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        'elevate': '0 10px 24px -4px rgba(0, 0, 0, 0.04), 0 4px 8px -4px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
