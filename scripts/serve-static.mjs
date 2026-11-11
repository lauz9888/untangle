// Minimal static file server for the built Storybook (storybook-static/).
// Usage: node scripts/serve-static.mjs <dir> <port>
// Used by playwright.storybook.config.ts instead of `vite preview`, which
// would load vite.config.ts's PWA/base-path config.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const [dirArg = 'storybook-static', portArg = '6007'] = process.argv.slice(2)
const root = path.resolve(dirArg)
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = path.join(root, urlPath === '/' ? 'index.html' : urlPath)
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(Number(portArg), () => console.log(`Serving ${root} on http://localhost:${portArg}`))
