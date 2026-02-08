/**
 * Generate native icon (1024x1024) and splash screen (2732x2732) from favicon.
 * Run: node scripts/generate-native-assets.js
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(__dirname, '../public/Keplear-favicon.png')
const OUT_DIR = resolve(__dirname, '../resources')

mkdirSync(OUT_DIR, { recursive: true })

// 1024x1024 icon - centered on dark background, no alpha
await sharp(SOURCE)
  .resize(800, 800, { fit: 'contain', background: { r: 18, g: 18, b: 18, alpha: 1 } })
  .extend({
    top: 112,
    bottom: 112,
    left: 112,
    right: 112,
    background: { r: 18, g: 18, b: 18, alpha: 1 },
  })
  .flatten({ background: { r: 18, g: 18, b: 18 } })
  .png()
  .toFile(resolve(OUT_DIR, 'icon.png'))
console.log('Generated resources/icon.png (1024x1024)')

// 2732x2732 splash - centered logo on dark background
await sharp(SOURCE)
  .resize(512, 512, { fit: 'contain', background: { r: 18, g: 18, b: 18, alpha: 1 } })
  .extend({
    top: 1110,
    bottom: 1110,
    left: 1110,
    right: 1110,
    background: { r: 18, g: 18, b: 18, alpha: 1 },
  })
  .flatten({ background: { r: 18, g: 18, b: 18 } })
  .png()
  .toFile(resolve(OUT_DIR, 'splash.png'))
console.log('Generated resources/splash.png (2732x2732)')

// Also generate icon-only.png for foreground layer (for adaptive icons)
await sharp(SOURCE)
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(resolve(OUT_DIR, 'icon-only.png'))
console.log('Generated resources/icon-only.png (1024x1024, transparent bg)')

console.log('All native assets generated.')
