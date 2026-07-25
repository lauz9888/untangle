import { setWorldConstructor, World } from '@cucumber/cucumber'
import { useEnergyLevel } from '../../src/composables/useEnergyLevel'

// BDD scenarios drive the useEnergyLevel composable directly — the same
// singleton components use — rather than reaching into implementation
// details. Scenarios describe user-observable flows at a coarser grain than
// the composable/components unit test pairs in tests/unit/energy-level/.
export class EnergyWorld extends World {
  energy = useEnergyLevel()
}

setWorldConstructor(EnergyWorld)
