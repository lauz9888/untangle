import { test, expect } from './coverage-fixture'
import {
  encourageButton,
  toughLoveButton,
  completedButtonAlways,
  completedPanel,
  completedPanelClose,
  toast,
  makeTask,
  seedTasks,
} from './helpers'

const WIDTHS = [320, 360, 375, 390, 640]
const COUNTS = [0, 9, 99, 999]

async function seedCompleted(page: import('@playwright/test').Page, count: number) {
  const tasks = Array.from({ length: count }, (_, i) =>
    makeTask({
      id: i + 1,
      name: `Done ${i + 1}`,
      done: true,
      createdAt: 1000 + i,
      updatedAt: 1000 + i,
    })
  )
  await seedTasks(page, tasks)
  await page.reload()
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.describe('header action buttons share one row at mobile widths', () => {
  for (const width of WIDTHS) {
    for (const count of COUNTS) {
      test(`${width}px wide with ${count} completed tasks`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 })
        await seedCompleted(page, count)

        const label = `Completed (${count})`
        const encourage = encourageButton(page)
        const tough = toughLoveButton(page)
        const completed = completedButtonAlways(page)
        await expect(completed).toHaveText(label)

        const e = await encourage.boundingBox()
        const t = await tough.boundingBox()
        const c = await completed.boundingBox()
        if (!e || !t || !c) throw new Error('header button has no bounding box')

        // Same row (top offsets within 1px)
        expect(Math.abs(e.y - t.y)).toBeLessThanOrEqual(1)
        expect(Math.abs(t.y - c.y)).toBeLessThanOrEqual(1)

        // DOM / visual order left to right
        expect(e.x).toBeLessThan(t.x)
        expect(t.x).toBeLessThan(c.x)

        // Inside viewport, no horizontal scroll
        for (const b of [e, t, c]) {
          expect(b.x).toBeGreaterThanOrEqual(0)
          expect(b.x + b.width).toBeLessThanOrEqual(width)
          expect(b.height).toBeGreaterThanOrEqual(44)
          expect(b.width).toBeGreaterThanOrEqual(44)
        }
        const noOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
        expect(noOverflow).toBe(true)

        // Labels not clipped, font-size >= 12px
        for (const l of [encourage, tough, completed]) {
          const info = await l.evaluate((el) => ({
            fits: el.scrollWidth <= el.clientWidth,
            fontSize: parseFloat(getComputedStyle(el).fontSize),
          }))
          expect(info.fits).toBe(true)
          expect(info.fontSize).toBeGreaterThanOrEqual(12)
        }
      })
    }
  }
})

test('desktop layout is unchanged just above the breakpoint (641px)', async ({ page }) => {
  await page.setViewportSize({ width: 641, height: 812 })
  await seedCompleted(page, 999)

  const fontSize = await encourageButton(page).evaluate((el) => getComputedStyle(el).fontSize)
  expect(fontSize).toBe('13.6px')

  await expect(page.locator('.header-buttons')).toHaveCount(1)
  const wrapperDisplay = await page
    .locator('.header-buttons')
    .evaluate((el) => getComputedStyle(el).display)
  expect(wrapperDisplay).toBe('contents')
})

test.describe('at 320px', () => {
  test.use({ viewport: { width: 320, height: 812 } })

  test('mobile buttons show a visible keyboard focus ring in DOM order', async ({ page }) => {
    await seedCompleted(page, 999)
    const ring = (l: ReturnType<typeof encourageButton>) =>
      l.evaluate((el) => {
        const s = getComputedStyle(el)
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }
      })

    await encourageButton(page).focus()
    await page.keyboard.press('Tab')
    await expect(toughLoveButton(page)).toBeFocused()
    let r = await ring(toughLoveButton(page))
    expect(r.style).not.toBe('none')
    expect(r.width).toBeGreaterThanOrEqual(2)

    await page.keyboard.press('Tab')
    await expect(completedButtonAlways(page)).toBeFocused()
    r = await ring(completedButtonAlways(page))
    expect(r.style).not.toBe('none')
    expect(r.width).toBeGreaterThanOrEqual(2)

    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(encourageButton(page)).toBeFocused()
    r = await ring(encourageButton(page))
    expect(r.style).not.toBe('none')
    expect(r.width).toBeGreaterThanOrEqual(2)
  })

  test('focus returns to the Completed button after the panel closes', async ({ page }) => {
    await seedCompleted(page, 999)
    await completedButtonAlways(page).focus()
    await page.keyboard.press('Enter')
    await expect(completedPanel(page)).toBeVisible()
    await completedPanelClose(page).click()
    await expect(completedPanel(page)).toBeHidden()
    await expect(completedButtonAlways(page)).toBeFocused()
  })

  test('toast does not overlap the header and the header does not overlap the board', async ({
    page,
  }) => {
    await seedCompleted(page, 999)
    await encourageButton(page).click()
    await expect(toast(page)).toBeVisible()

    const header = (await page.locator('#app-header').boundingBox())!
    const toastBox = (await toast(page).boundingBox())!
    const board = (await page.locator('.now-next-later-board').boundingBox())!

    expect(toastBox.y).toBeGreaterThanOrEqual(header.y + header.height - 1)
    expect(header.y + header.height).toBeLessThanOrEqual(board.y + 1)
  })
})
