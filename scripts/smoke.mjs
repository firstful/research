// Render smoke test across research.ffilt.us pages (local preview at :4173)
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const pages = [
  ['/', 'home'],
  ['/value-index', 'frontier'],
  ['/value-index/landscape', 'landscape'],
  ['/value-index/models', 'models'],
  ['/value-index/methodology', 'methodology'],
  ['/notes', 'notes'],
  ['/charts', 'charts'],
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(`[console] ${m.text().slice(0, 200)}`)
})
page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${String(e).slice(0, 200)}`))

let failed = 0
for (const [route, label] of pages) {
  const errors = []
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600) // let recharts settle
  const svgs = await page.locator('svg').count()
  const bodyText = (await page.locator('body').innerText()).slice(0, 120).replace(/\n/g, ' | ')
  const state = await page.evaluate(() => ({
    title: document.title,
    svgCount: document.querySelectorAll('svg').length,
    tableRows: document.querySelectorAll('table tbody tr').length,
    canvasCount: document.querySelectorAll('canvas').length,
  }))
  console.log(`\n=== ${route} (${label}) ===`)
  console.log(`title: ${state.title}`)
  console.log(`svg: ${state.svgCount} · tableRows: ${state.tableRows} · canvas: ${state.canvasCount}`)
  console.log(`body: ${bodyText}`)
  if (state.svgCount === 0 && (route === '/value-index' || route === '/value-index/landscape')) { errors.push('no svg rendered'); failed++ }
  const shot = await page.screenshot({ path: `/tmp/research-shots/${label}.png`, fullPage: false })
  console.log(`shot: ${shot.length} bytes`)
  if (errors.length) { failed++; console.log('FAIL:', errors.join('; ')) }
}

// interactive check: frontier period chip click → table updates
await page.goto(BASE + '/value-index', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const before = await page.locator('table tbody tr').count()
await page.getByText('2024H1', { exact: true }).first().click()
await page.waitForTimeout(400)
const after = await page.locator('table tbody tr').count()
console.log(`\ninteractive: frontier rows before=${before} after-chip-click=${after}`)
if (before === after && before === 0) { console.log('FAIL: no frontier table rows'); failed++ }

// models tab: search filter
await page.goto(BASE + '/value-index/models', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const rowsAll = await page.locator('table tbody tr').count()
await page.locator('input[type="search"]').fill('llama')
await page.waitForTimeout(400)
const rowsFiltered = await page.locator('table tbody tr').count()
console.log(`models: rows all=${rowsAll} filtered('llama')=${rowsFiltered}`)
if (rowsAll === 0 || rowsFiltered === 0) { console.log('FAIL: model table empty'); failed++ }

console.log(`\nconsoleErrors: ${consoleErrors.length}`)
consoleErrors.slice(0, 10).forEach((e) => console.log('  ' + e))
console.log(failed === 0 && consoleErrors.length === 0 ? '\nALL PASS' : `\n${failed} FAILURES`)
await browser.close()
process.exit(failed === 0 && consoleErrors.length === 0 ? 0 : 1)
