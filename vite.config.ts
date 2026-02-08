import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { pipedDevPlugin } from './vite-piped-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/', // For custom domain keplear.com
  plugins: [
    react(),
    pipedDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // Use static public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            // Instrument samples from nbrosowsky.github.io
            urlPattern: /^https:\/\/nbrosowsky\.github\.io\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'instrument-samples',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts stylesheets and font files
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase API calls
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
    // Bundle analyzer for development builds
    ...(mode === 'analyze'
      ? [
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
          })(),
        ].filter(Boolean)
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          audio: ['tone'],
          auth: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
        // Preserve export names to prevent minification issues
        exports: 'named',
      },
      // Ensure module exports are preserved
      preserveEntrySignatures: 'exports-only',
    },
    // Enable source maps for better debugging
    sourcemap: mode === 'development',
    // Use esbuild for minification (more consistent across platforms than terser)
    minify: 'esbuild',
    // Report bundle size
    reportCompressedSize: true,
    // Set chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: ['tone'], // Tone.js is dynamically imported
  },
  // Development server optimizations
  server: {
    hmr: {
      overlay: false, // Disable HMR overlay for better development experience
    },
    // Proxy for Piped API (YouTube search) - search works, streams are broken upstream
    proxy: {
      '/api/piped1': {
        target: 'https://api.piped.private.coffee', // Most reliable for search
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/piped1/, ''),
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      '/api/piped2': {
        target: 'https://pipedapi.kavin.rocks', // Official instance
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/piped2/, ''),
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      '/api/piped3': {
        target: 'https://pipedapi.adminforge.de', // Germany
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/piped3/, ''),
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      '/api/piped4': {
        target: 'https://api.piped.private.coffee', // Fallback to most reliable
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/piped4/, ''),
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
    },
    // Security headers for development server
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'microphone=(self), camera=()',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://*.youtube.com https://www.google.com https://*.google.com https://w.soundcloud.com https://connect.soundcloud.com https://pagead2.googlesyndication.com https://*.googleadservices.com https://*.googlesyndication.com https://adservice.google.com https://www.googletagmanager.com https://tpc.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://nbrosowsky.github.io https://*.soundcloud.com https://*.sndcdn.com https://*.dzcdn.net https://*.googlevideo.com https://*.youtube.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nbrosowsky.github.io https://api-v2.soundcloud.com https://*.soundcloud.com https://www.youtube.com https://*.youtube.com https://*.google.com https://*.googlevideo.com https://api.piped.private.coffee https://pipedapi.kavin.rocks https://pipedapi.adminforge.de https://piped-api.garudalinux.org https://pipedapi.r4fo.com https://pipedapi.darkness.services https://pipedapi.simpleprivacy.fr https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleadservices.com https://*.doubleclick.net; frame-src 'self' https://www.youtube.com https://*.youtube.com https://w.soundcloud.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';",
    },
  },
  // Preview server (production build preview)
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'microphone=(self), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://*.youtube.com https://www.google.com https://*.google.com https://w.soundcloud.com https://connect.soundcloud.com https://pagead2.googlesyndication.com https://*.googleadservices.com https://*.googlesyndication.com https://adservice.google.com https://www.googletagmanager.com https://tpc.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://nbrosowsky.github.io https://*.soundcloud.com https://*.sndcdn.com https://*.dzcdn.net https://*.googlevideo.com https://*.youtube.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nbrosowsky.github.io https://api-v2.soundcloud.com https://*.soundcloud.com https://www.youtube.com https://*.youtube.com https://*.google.com https://*.googlevideo.com https://api.piped.private.coffee https://pipedapi.kavin.rocks https://pipedapi.adminforge.de https://piped-api.garudalinux.org https://pipedapi.r4fo.com https://pipedapi.darkness.services https://pipedapi.simpleprivacy.fr https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleadservices.com https://*.doubleclick.net; frame-src 'self' https://www.youtube.com https://*.youtube.com https://w.soundcloud.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';",
    },
  },
}))
