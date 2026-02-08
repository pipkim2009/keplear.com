/**
 * Strip the CSP meta tag from dist/index.html for Capacitor builds.
 * The CSP meta tag blocks Capacitor's WebView origin.
 * Web builds keep CSP via Vercel headers in vercel.json.
 *
 * Run: node scripts/strip-csp-for-capacitor.js
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexPath = resolve(__dirname, '../dist/index.html')

let html = readFileSync(indexPath, 'utf-8')

// Remove the CSP meta tag (may span multiple lines)
html = html.replace(
  /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/gs,
  '<!-- CSP meta tag removed for Capacitor build -->'
)

writeFileSync(indexPath, html, 'utf-8')
console.log('Stripped CSP meta tag from dist/index.html for Capacitor build.')
