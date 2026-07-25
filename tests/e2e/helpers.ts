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
