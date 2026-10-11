import { describe, it, expect } from 'vitest'
import {
  groupActiveTasksBySection,
  getCompletionFocusTarget,
} from '../../../src/composables/useBoardOrdering'
import type { Task } from '../../../src/composables/useTasks'

function makeTask(overrides: Partial<Task> & { id: number }): Task {
  return {
    name: `Task ${overrides.id}`,
    section: 'now',
    description: '',
    energyLevel: null,
    estimate: { days: 0, hours: 0, minutes: 0 },
    availableFrom: null,
    dueBy: null,
    subTasks: [],
    done: false,
    createdAt: overrides.id,
    updatedAt: overrides.id,
    ...overrides,
  }
}

describe('groupActiveTasksBySection', () => {
  it('returns empty now/next/later arrays for no tasks', () => {
    expect(groupActiveTasksBySection([])).toEqual({ now: [], next: [], later: [] })
  })

  it('excludes done tasks', () => {
    const result = groupActiveTasksBySection([
      makeTask({ id: 1, done: true }),
      makeTask({ id: 2, done: false }),
    ])
    expect(result.now.map((t) => t.id)).toEqual([2])
  })

  it('groups by section', () => {
    const result = groupActiveTasksBySection([
      makeTask({ id: 1, section: 'later' }),
      makeTask({ id: 2, section: 'now' }),
      makeTask({ id: 3, section: 'next' }),
    ])
    expect(result.now.map((t) => t.id)).toEqual([2])
    expect(result.next.map((t) => t.id)).toEqual([3])
    expect(result.later.map((t) => t.id)).toEqual([1])
  })

  it('sorts each group by createdAt ascending', () => {
    const result = groupActiveTasksBySection([
      makeTask({ id: 1, createdAt: 300 }),
      makeTask({ id: 2, createdAt: 100 }),
      makeTask({ id: 3, createdAt: 200 }),
    ])
    expect(result.now.map((t) => t.id)).toEqual([2, 3, 1])
  })

  it('does not modify the input array', () => {
    const input = [makeTask({ id: 1, createdAt: 300 }), makeTask({ id: 2, createdAt: 100 })]
    const snapshot = input.map((t) => t.id)
    groupActiveTasksBySection(input)
    expect(input.map((t) => t.id)).toEqual(snapshot)
  })
})

describe('getCompletionFocusTarget', () => {
  it('returns the next not-done task in the same section', () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2 }), makeTask({ id: 3 })]
    expect(getCompletionFocusTarget(tasks, 1)).toEqual({ kind: 'task', id: 2 })
    expect(getCompletionFocusTarget(tasks, 2)).toEqual({ kind: 'task', id: 3 })
  })

  it('returns the previous task when the task is last', () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2 }), makeTask({ id: 3 })]
    expect(getCompletionFocusTarget(tasks, 3)).toEqual({ kind: 'task', id: 2 })
  })

  it('returns the section target when it is the only task in its section', () => {
    const tasks = [makeTask({ id: 1, section: 'next' })]
    expect(getCompletionFocusTarget(tasks, 1)).toEqual({ kind: 'section', key: 'next' })
  })

  it('ignores tasks in other sections', () => {
    const tasks = [
      makeTask({ id: 1, section: 'now' }),
      makeTask({ id: 2, section: 'next' }),
      makeTask({ id: 3, section: 'later' }),
    ]
    expect(getCompletionFocusTarget(tasks, 1)).toEqual({ kind: 'section', key: 'now' })
  })

  it('skips done tasks when choosing the next task', () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2, done: true }), makeTask({ id: 3 })]
    expect(getCompletionFocusTarget(tasks, 1)).toEqual({ kind: 'task', id: 3 })
  })

  it('skips done tasks when falling back to the previous task', () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2, done: true }), makeTask({ id: 3 })]
    expect(getCompletionFocusTarget(tasks, 3)).toEqual({ kind: 'task', id: 1 })
  })

  it('orders by createdAt, not array order', () => {
    const tasks = [
      makeTask({ id: 1, createdAt: 300 }),
      makeTask({ id: 2, createdAt: 100 }),
      makeTask({ id: 3, createdAt: 200 }),
    ]
    expect(getCompletionFocusTarget(tasks, 2)).toEqual({ kind: 'task', id: 3 })
  })

  it('returns the section target for an already-done task', () => {
    const tasks = [
      makeTask({ id: 1, done: true, section: 'later' }),
      makeTask({ id: 2, section: 'later' }),
    ]
    expect(getCompletionFocusTarget(tasks, 1)).toEqual({ kind: 'section', key: 'later' })
  })

  it('returns null for an unknown id', () => {
    expect(getCompletionFocusTarget([makeTask({ id: 1 })], 99)).toBeNull()
  })

  it('is data-based: a mixed board gives the same answers regardless of any collapse state', () => {
    const tasks = [
      makeTask({ id: 1, section: 'now' }),
      makeTask({ id: 2, section: 'now' }),
      makeTask({ id: 3, section: 'next' }),
      makeTask({ id: 4, section: 'later', done: true }),
    ]
    expect(getCompletionFocusTarget(tasks, 1)).toEqual({ kind: 'task', id: 2 })
    expect(getCompletionFocusTarget(tasks, 3)).toEqual({ kind: 'section', key: 'next' })
  })
})
