import { chromium } from '@playwright/test'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dir, '..', 'public', 'favicon.svg')
const publicDir = join(__dir, '..', 'public')

const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  await import('fs').then(fs => fs.readFileSync(svgPath, 'utf8'))
)}`

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

await page.setContent(`<!DOCTYPE html>
<html>
<head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#863bff}img{width:100%;height:100%;display:block}</style></head>
<body><img src="${svgDataUrl}"></body>
</html>`)

for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size })
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } })
  writeFileSync(join(publicDir, `pwa-${size}x${size}.png`), png)
  console.log(`Generated pwa-${size}x${size}.png`)
}

await browser.close()
