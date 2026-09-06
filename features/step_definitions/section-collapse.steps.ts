import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { EnergyWorld } from '../support/world'
import type { SectionKey } from '../../src/composables/useSectionCollapse'

const SECTION_KEYS_BY_LABEL: Record<string, SectionKey> = {
  Now: 'now',
  Next: 'next',
  Later: 'later',
}

function keyForLabel(label: string): SectionKey {
  const key = SECTION_KEYS_BY_LABEL[label]
  if (!key) {
    throw new Error(`No section named "${label}"`)
  }
  return key
}

Given(
  'I have collapsed the {string} section',
  function (this: EnergyWorld, label: string) {
    const key = keyForLabel(label)
    this.sections.toggle(key)
    this.lastToggledSectionKey = key
  }
)

When('I collapse the {string} section', function (this: EnergyWorld, label: string) {
  const key = keyForLabel(label)
  this.sections.toggle(key)
  this.lastToggledSectionKey = key
})

When('I expand the {string} section', function (this: EnergyWorld, label: string) {
  const key = keyForLabel(label)
  this.sections.toggle(key)
  this.lastToggledSectionKey = key
})

Then(
  'the {string} section should be expanded',
  function (this: EnergyWorld, label: string) {
    assert.equal(this.sections.expanded[keyForLabel(label)], true)
  }
)

Then(
  'the {string} section should be collapsed',
  function (this: EnergyWorld, label: string) {
    assert.equal(this.sections.expanded[keyForLabel(label)], false)
  }
)

Then('the other sections should remain expanded', function (this: EnergyWorld) {
  const actedOn = this.lastToggledSectionKey
  assert.notEqual(actedOn, null, 'no section has been acted on yet in this scenario')

  const otherKeys = (Object.keys(this.sections.expanded) as SectionKey[]).filter(
    (key) => key !== actedOn
  )
  assert.ok(otherKeys.length > 0, 'expected at least one other section to check')

  for (const key of otherKeys) {
    assert.equal(
      this.sections.expanded[key],
      true,
      `expected section "${key}" to remain expanded`
    )
  }
})
