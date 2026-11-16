import { expect, it } from 'vitest'
import { readScenario } from '../simulation/scenarioLink'

it('reopens shared parameters including zero values', () => {
  expect(readScenario('#/simulation?ventilation=0&scrubber=.75&activity=2.5'))
    .toEqual({ventilation:0,scrubber:.75,activity:2.5})
})
it('rejects missing, non-finite, or out-of-range parameters', () => {
  for (const value of ['', 'NaN', 'Infinity', '-.1', '1.1']) {
    expect(readScenario('#/simulation?ventilation='+value+'&scrubber=.5&activity=1')).toBeNull()
  }
  expect(readScenario('#/simulation?ventilation=.5&activity=1')).toBeNull()
})
