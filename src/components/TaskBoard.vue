<script setup>
import { COLUMNS } from '../constants/energy.js'
import TaskColumn from './TaskColumn.vue'
</script>

<template>
  <div class="task-board">
    <TaskColumn v-for="column in COLUMNS" :key="column.id" :column="column" />
  </div>
</template>

<style scoped>
.task-board {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 24px;
}

.task-board > * {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .task-board {
    flex-direction: column;
    padding: 16px;
    align-items: stretch;
  }

  .task-board > * {
    width: 100%;
  }
}
</style>
