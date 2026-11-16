import { describe, expect, it } from 'vitest'
import { initial, presets, run, step } from '../simulation/engine'

describe('compartment balance', () => {
  it('conserves weighted concentration when exchange is the only term', () => {
    const point={t:0,cabin:650,local:2400}
    const next=step(point,{ventilation:1,scrubber:0,activity:0},300)
    expect(30*next.cabin+next.local).toBeCloseTo(30*point.cabin+point.local,8)
    expect(next.local).toBeGreaterThanOrEqual(next.cabin)
  })
  it('balances integrated source and removal for a one-second step', () => {
    const settings={ventilation:.5,scrubber:.65,activity:2}
    const next=step(initial,settings)
    expect(30*next.cabin+next.local-31*650).toBeCloseTo(44-.15*.65*650)
  })
  it('stays bounded and positive at zero and full mixing and removal', () => {
    for(const ventilation of [0,1]) {
      for(const scrubber of [0,1]) {
        const points=run({ventilation,scrubber,activity:3},3600)
        expect(points.every(p=>p.local>=0 && p.cabin>=0 && p.local<=650+66*p.t && p.cabin<=650+66*p.t)).toBe(true)
      }
    }
  })
  it('uses the same one-second subdivisions for long steps', () => {
    const settings=presets['Exercise session']
    expect(step(initial,settings,300)).toEqual(run(settings)[300])
  })
})
