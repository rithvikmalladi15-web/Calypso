import { expect, it } from 'vitest'
import { run, presets } from '../simulation/engine'
import { cabinSensor, detect, isLocal, localSensor, reading } from '../simulation/sensorModel'
it('maps markers to model-derived compartment readings',()=>{
  const point={t:10,cabin:800,local:1500}
  expect(isLocal(cabinSensor)).toBe(false)
  expect(isLocal(localSensor)).toBe(true)
  expect(reading(point,cabinSensor)).toBe(800)
  expect(reading(point,localSensor)).toBe(1500)
})
it('distinguishes a missed crossing, true crossing, and false alert',()=>{
  const points=run(presets['Reduced ventilation'])
  expect(detect(points,[cabinSensor]).alert).toBeUndefined()
  const coverage=detect(points,[cabinSensor,localSensor])
  expect(coverage.truth).toBeGreaterThan(0)
  expect(coverage.delay).toBe(0)
  expect(coverage.meanError).toBe(0)
  const falseAlert=detect([{t:0,cabin:1249,local:1249}],[cabinSensor],10)
  expect(falseAlert.truth).toBeUndefined()
  // S1's phase is negative at zero seconds. Use a phase with positive noise.
  expect(detect([{t:1,cabin:1249,local:1249}],[localSensor],50).alert).toBe(1)
})
