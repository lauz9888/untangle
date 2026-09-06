<script setup lang="ts">
import CollapsibleSection from './CollapsibleSection.vue'
import { useSectionCollapse, SECTION_DEFS } from '../composables/useSectionCollapse'

const { expanded, toggle } = useSectionCollapse()
</script>

<template>
  <div class="now-next-later-board">
    <CollapsibleSection
      v-for="section in SECTION_DEFS"
      :key="section.key"
      :section-key="section.key"
      :label="section.label"
      :expanded="expanded[section.key]"
      @toggle="toggle(section.key)"
    />
  </div>
</template>

<style scoped>
.now-next-later-board {
  display: flex;
  flex-direction: row; /* desktop-first: columns, Requirement 3 */
  gap: 1rem;
  margin-top: 6rem; /* clears the absolutely-positioned .brand header at >640px — implementer:
                        verify visually against actual rendered header height, including the
                        case where .header-actions wraps to a second line on narrower desktop
                        widths (~641–900px); adjust this value if the header overlaps content */
  padding: 0 1.5rem 1.5rem;
}
.now-next-later-board > * {
  flex: 1 1 0;
  min-width: 0;
}
@media (max-width: 640px) {
  .now-next-later-board {
    flex-direction: column; /* rows, Requirement 4 */
    margin-top: 1rem; /* .brand is position: static at this breakpoint and already occupies
                          flow space, so only a small gap is needed here */
  }
}
</style>
