/**
 * Vite dev server middleware plugin for local development.
 * Serves ONNX model files for stem separation.
 */

import type { Plugin } from 'vite'
import { readFile } from 'fs/promises'
import { join } from 'path'

export function pipedDevPlugin(): Plugin {
  return {
    name: 'piped-dev-middleware',
    configureServer(server) {
      // /api/spleeter-model - serve ONNX model files (local first, then HuggingFace)
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/spleeter-model')) return next()

        const url = new URL(req.url, 'http://localhost')
        const model = url.searchParams.get('model') || '2stems'
        const stem = url.searchParams.get('stem') || 'vocals'

        const validModels = ['2stems', '4stems', '5stems']
        if (!validModels.includes(model)) {
          res.writeHead(400)
          res.end('Invalid model parameter')
          return
        }

        // Try local file first (from conversion script output)
        const localPath = join(process.cwd(), 'spleeter-onnx', model, `${stem}.onnx`)
        try {
          const localBuffer = await readFile(localPath)
          console.log(
            `[spleeter-model] Serving local ${model}/${stem}.onnx (${(localBuffer.byteLength / 1024 / 1024).toFixed(1)} MB)`
          )
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Content-Length', localBuffer.byteLength.toString())
          res.writeHead(200)
          res.end(localBuffer)
          return
        } catch {
          // No local file, fall through to HuggingFace
        }

        // Fall back to HuggingFace
        const modelUrl = `https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-${model}/resolve/main/${stem}.onnx`

        try {
          console.log(`[spleeter-model] Fetching ${stem}.onnx from HuggingFace...`)
          const response = await fetch(modelUrl)
          if (!response.ok) {
            res.writeHead(response.status)
            res.end(`Failed to fetch model: HTTP ${response.status}`)
            return
          }

          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Access-Control-Allow-Origin', '*')
          const contentLength = response.headers.get('content-length')
          if (contentLength) res.setHeader('Content-Length', contentLength)
          res.writeHead(200)

          const reader = (response.body as ReadableStream<Uint8Array>).getReader()
          let totalBytes = 0
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
            totalBytes += value.byteLength
          }
          console.log(
            `[spleeter-model] Streamed ${stem}.onnx: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
          )
          res.end()
        } catch (e) {
          console.error('[spleeter-model] Failed:', (e as Error).message)
          if (!res.headersSent) res.writeHead(502)
          res.end()
        }
      })
    },
  }
}
