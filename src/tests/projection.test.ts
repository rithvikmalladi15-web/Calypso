import { describe,it,expect } from 'vitest'
import { projectInterventions } from '../simulation/projection'
import { run,step,presets } from '../simulation/engine'
describe('Intervention projections',()=>{
  it('branches from the actual state and preserves inputs',()=>{
    const settings=Object.freeze({...presets['Reduced ventilation']})
    const point=Object.freeze(run(settings,300).at(-1)!)
    const projections=projectInterventions(point,settings)
    expect(projections[0].point).toEqual(step(point,settings,60))
    expect(projections[1].point.local).toBeLessThan(projections[0].point.local)
    expect(projections[3].point.local).toBeLessThan(projections[0].point.local)
    expect(point.t).toBe(300)
  })
  it('matches a subsequent run with the selected intervention',()=>{
    const settings=presets['Reduced ventilation'],point=run(settings,300).at(-1)!
    for(const forecast of projectInterventions(point,settings)) {
      let actual=point
      for(let i=0;i<60;i++) actual=step(actual,{...settings,...forecast.patch})
      expect(forecast.point).toEqual(actual)
    }
  })
  it('respects the experiment time limit',()=>{
    const point={t:3590,cabin:700,local:1300}
    expect(projectInterventions(point,presets.Baseline)[0].point.t).toBe(3600)
    expect(projectInterventions({...point,t:3600},presets.Baseline)[0].point).toEqual({...point,t:3600})
  })
})
