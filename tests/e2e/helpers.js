export function energyButton(page, label) {
  return page.getByRole('button', { name: label, exact: true })
}

export function toast(page) {
  return page.getByRole('status')
}

export function encourageButton(page) {
  return page.getByRole('button', { name: 'Encourage me', exact: true })
}

export function toughLoveButton(page) {
  return page.getByRole('button', { name: 'Tough love', exact: true })
}
