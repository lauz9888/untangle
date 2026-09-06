<script setup lang="ts">
import { computed } from 'vue'
import type { SectionKey } from '../composables/useSectionCollapse'

const props = defineProps<{
  sectionKey: SectionKey
  label: string
  expanded: boolean
}>()

defineEmits<{ toggle: [] }>()

const headingId = computed(() => `section-${props.sectionKey}-heading`)
const contentId = computed(() => `section-${props.sectionKey}-content`)
</script>

<template>
  <section class="now-next-later-section" :aria-labelledby="headingId">
    <div class="section-header">
      <h2 :id="headingId" class="section-heading">{{ label }}</h2>
      <button
        type="button"
        class="section-toggle"
        :aria-expanded="expanded"
        :aria-controls="contentId"
        @click="$emit('toggle')"
      >
        {{ expanded ? `Collapse ${label}` : `Expand ${label}` }}
        <span class="chevron" aria-hidden="true">▾</span>
      </button>
    </div>
    <div :id="contentId" class="section-content" :hidden="!expanded"></div>
  </section>
</template>

<style scoped>
.now-next-later-section {
  border: 1px solid #e2e2e2;
  border-radius: 0.5rem;
  background: #fff;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.1rem;
}
.section-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}
.section-toggle {
  /* LOAD-BEARING for Requirement 10 (aria-expanded correctness), not just Requirement 3's layout:
     this rule removes the button from the accessibility tree above 640px, which is the only
     reason a technically-stale aria-expanded value at that breakpoint is harmless (no AT user can
     ever reach a control that isn't exposed). Do not replace this with a visual-only hiding
     technique (e.g. opacity/visibility/clip) without also re-deriving aria-expanded correctly for
     that breakpoint — see the design's "Accessibility" section for the full explanation. */
  display: none; /* desktop-first: no control at all above 640px, Requirement 3 */
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.7rem;
  border-radius: 0.4rem;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
}
.section-content {
  padding: 0 1.1rem 1rem;
}
.section-content[hidden] {
  display: block; /* neutralize native [hidden] default above 640px: always expanded, Requirement 3 */
}
@media (max-width: 640px) {
  .section-toggle {
    display: inline-flex;
    min-height: 44px;
    min-width: 44px; /* existing ~44px tap-target convention */
  }
  .section-content[hidden] {
    display: none; /* respect real collapsed state at/below 640px, Requirements 4/14 */
  }
}
</style>
