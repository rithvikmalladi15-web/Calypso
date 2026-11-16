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

it('preserves the analytic steady state and converges to it',()=>{
 const settings=presets.Baseline
 const source=22*settings.activity, removal=.15*settings.scrubber, exchange=.006+.074*settings.ventilation
 const cabin=source/removal,local=cabin+source/exchange
 const equilibrium={t:0,cabin,local}
 expect(step(equilibrium,settings,3600).cabin).toBeCloseTo(cabin,9)
 expect(step(equilibrium,settings,3600).local).toBeCloseTo(local,9)
 let point=initial
 for(let i=0;i<10;i++)point=step(point,settings,3600)
 expect(point.cabin).toBeCloseTo(cabin,6)
 expect(point.local).toBeCloseTo(local,6)
})
it('has no spontaneous CO2 in the zero-source zero-initial case',()=>{
 for(const ventilation of [0,.5,1])for(const scrubber of [0,.5,1]) {
  expect(step({t:0,cabin:0,local:0},{ventilation,scrubber,activity:0},3600)).toEqual({t:3600,cabin:0,local:0})
 }
})
it('removes total CO2 monotonically when source is zero',()=>{
 const points=run({...presets.Baseline,activity:0},3600)
 for(let i=1;i<points.length;i++)expect(30*points[i].cabin+points[i].local).toBeLessThanOrEqual(30*points[i-1].cabin+points[i-1].local)
})
