import { reactive } from 'vue'

export type SectionKey = 'now' | 'next' | 'later'

export interface SectionDef {
  key: SectionKey
  label: string
}

export const SECTION_DEFS: SectionDef[] = [
  { key: 'now', label: 'Now' },
  { key: 'next', label: 'Next' },
  { key: 'later', label: 'Later' },
]

export function useSectionCollapse() {
  const expanded = reactive<Record<SectionKey, boolean>>({
    now: true,
    next: true,
    later: true,
  })

  function toggle(key: SectionKey) {
    expanded[key] = !expanded[key]
  }

  return { expanded, toggle }
}
