import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Allow JSX inside .js files (legacy useApi.js contains NetworkErrorCard JSX)
    react({ include: /\.(jsx|js)$/ }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'sweetalert2'],
        },
      },
    },
  },
  // Vitest configuration. The /// reference comment is needed so the test field
  // is type-checked, but works fine without it for plain JS projects.
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/__tests__/**',
        'src/main.jsx',
        'src/native/**',
      ],
    },
  },
})
