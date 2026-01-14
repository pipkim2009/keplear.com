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
    minify: mode === 'production' ? 'terser' : false,
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
    },
    // Security headers for development server
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'microphone=(self), camera=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://nbrosowsky.github.io; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nbrosowsky.github.io; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';"
    }
  },
  // Preview server (production build preview)
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'microphone=(self), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://nbrosowsky.github.io; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nbrosowsky.github.io; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';"
    }
  }
}))
