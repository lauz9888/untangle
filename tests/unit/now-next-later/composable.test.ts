import { describe, it, expect } from 'vitest'
import { useSectionCollapse, SECTION_DEFS } from '../../../src/composables/useSectionCollapse'

describe('useSectionCollapse', () => {
  it('defaults every section to expanded', () => {
    const { expanded } = useSectionCollapse()
    expect(expanded).toEqual({ now: true, next: true, later: true })
  })

  it('toggling one section flips only that section', () => {
    const { expanded, toggle } = useSectionCollapse()

    toggle('now')

    expect(expanded.now).toBe(false)
    expect(expanded.next).toBe(true)
    expect(expanded.later).toBe(true)
  })

  it('toggling the same section twice returns it to its original value', () => {
    const { expanded, toggle } = useSectionCollapse()

    toggle('next')
    toggle('next')

    expect(expanded.next).toBe(true)
  })

  it('produces independent state across separate calls (non-singleton)', () => {
    const first = useSectionCollapse()
    const second = useSectionCollapse()

    first.toggle('later')

    expect(first.expanded.later).toBe(false)
    expect(second.expanded.later).toBe(true)
  })

  it('exposes SECTION_DEFS with exactly three entries in now/next/later order with fixed labels', () => {
    expect(SECTION_DEFS).toHaveLength(3)
    expect(SECTION_DEFS.map((section) => section.key)).toEqual(['now', 'next', 'later'])
    expect(SECTION_DEFS.map((section) => section.label)).toEqual(['Now', 'Next', 'Later'])
  })
})
