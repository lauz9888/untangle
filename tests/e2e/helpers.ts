import type { Page } from '@playwright/test'

export function energyButton(page: Page, label: string) {
  return page.getByRole('button', { name: label, exact: true })
}

export function toast(page: Page) {
  return page.getByRole('status')
}

export function encourageButton(page: Page) {
  return page.getByRole('button', { name: 'Encourage me', exact: true })
}

export function toughLoveButton(page: Page) {
  return page.getByRole('button', { name: 'Tough love', exact: true })
}

export function sectionToggle(page: Page, label: string) {
  return page.getByRole('button', { name: new RegExp(`^(Collapse|Expand) ${label}$`) })
}

export function sectionContent(page: Page, key: string) {
  return page.locator(`#section-${key}-content`)
}
