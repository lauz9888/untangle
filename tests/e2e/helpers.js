export function energyButton(page, label) {
  return page.getByRole('button', { name: label, exact: true })
}

export function toast(page) {
  return page.getByRole('status')
}
