import { setWorldConstructor, World } from '@cucumber/cucumber'
import { useEnergyLevel } from '../../src/composables/useEnergyLevel'
import { useSectionCollapse, type SectionKey } from '../../src/composables/useSectionCollapse'

// BDD scenarios drive composables directly — the same instances/singletons
// components use — rather than reaching into implementation details.
// Scenarios describe user-observable flows at a coarser grain than the
// composable/components unit test pairs under tests/unit/.
//
// Cucumber supports only one World constructor per project, so unrelated
// feature areas each get their own property on this same class rather than
// a second World. `sections` is a fresh `useSectionCollapse()` instance per
// scenario (it is not a singleton — see ADR 0001), so no explicit reset step
// is needed for it, unlike `energy`.
export class EnergyWorld extends World {
  energy = useEnergyLevel()
  sections = useSectionCollapse()
  // Tracks which section a preceding When step most recently acted on, so a
  // later "the other sections should remain expanded" step can identify
  // "the other two" without repeating the section name in the Gherkin.
  lastToggledSectionKey: SectionKey | null = null
}

setWorldConstructor(EnergyWorld)
