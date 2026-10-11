import type { SectionKey } from './useSectionCollapse'
import type { Task } from './useTasks'

export type FocusTarget = { kind: 'task'; id: number } | { kind: 'section'; key: SectionKey }

export function groupActiveTasksBySection(tasks: Task[]): Record<SectionKey, Task[]> {
  const grouped: Record<SectionKey, Task[]> = { now: [], next: [], later: [] }
  for (const task of tasks) {
    if (!task.done) {
      grouped[task.section].push(task)
    }
  }
  for (const key of Object.keys(grouped) as SectionKey[]) {
    grouped[key].sort((a, b) => a.createdAt - b.createdAt)
  }
  return grouped
}

export function getCompletionFocusTarget(tasks: Task[], taskId: number): FocusTarget | null {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) {
    return null
  }
  const list = groupActiveTasksBySection(tasks)[task.section]
  const index = list.findIndex((t) => t.id === taskId)
  if (index === -1) {
    return { kind: 'section', key: task.section }
  }
  const neighbour = list[index + 1] ?? list[index - 1]
  if (neighbour) {
    return { kind: 'task', id: neighbour.id }
  }
  return { kind: 'section', key: task.section }
}
