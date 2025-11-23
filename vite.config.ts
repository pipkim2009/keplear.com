import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/', // For custom domain keplear.com
  plugins: [
    react(),
    // Bundle analyzer for development builds
    ...(mode === 'analyze' ? [
      (() => {
        // Dynamic import for bundle analyzer to avoid dependency issues
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { analyzer } = require('vite-bundle-analyzer')
          return analyzer({ analyzerMode: 'server', openAnalyzer: true })
        } catch {
          console.warn('vite-bundle-analyzer not available')
          return null
        }
      })()
    ].filter(Boolean) : [])
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          audio: ['tone'],
          auth: ['@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    },
    // Enable source maps for better debugging
    sourcemap: mode === 'development',
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production'
      }
    },
    // Report bundle size
    reportCompressedSize: true,
    // Set chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@contexts": path.resolve(__dirname, "./src/contexts"),
      "@constants": path.resolve(__dirname, "./src/constants"),
      "@styles": path.resolve(__dirname, "./src/styles"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: ['tone'] // Tone.js is dynamically imported
  },
  // Development server optimizations
  server: {
    hmr: {
      overlay: false // Disable HMR overlay for better development experience
    }
  }
}))
