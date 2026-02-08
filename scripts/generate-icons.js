/**
 * Generate PWA icon set from Keplear favicon.
 * Run: node scripts/generate-icons.js
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(__dirname, '../public/Keplear-favicon.png')
const OUT_DIR = resolve(__dirname, '../public/icons')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

mkdirSync(OUT_DIR, { recursive: true })

for (const size of SIZES) {
  await sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: { r: 18, g: 18, b: 18, alpha: 1 } })
    .png()
    .toFile(resolve(OUT_DIR, `icon-${size}x${size}.png`))
  console.log(`Generated icon-${size}x${size}.png`)
}

console.log('All icons generated.')
