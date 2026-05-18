import { ref } from 'vue'

// Shared drag state so multiple components can coordinate touch drag.
export const activeTouchDragId = ref(null)
