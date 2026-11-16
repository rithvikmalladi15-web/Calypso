import { expect, it, afterEach } from 'vitest'
import { useSim } from '../stores/simulationStore'
import { initial, presets, run, step } from '../simulation/engine'
import { defaultSupport, oxygenStep, replayPlan, supportTimeline } from '../simulation/lifeSupport'
import { snapshot } from '../stores/experimentStore'
import { cabinSensor } from '../simulation/sensorModel'
afterEach(()=>useSim.getState().select('Routine operations'))
it('applies interventions prospectively and exactly replays the recorded CO2 trajectory',()=>{
 useSim.getState().select('Reduced ventilation');useSim.getState().advance(60)
 const before=useSim.getState().points
 useSim.getState().intervene('mix',{ventilation:.9})
 expect(useSim.getState().points).toBe(before)
 useSim.getState().advance(60)
 const s=useSim.getState(),plan={initialSettings:s.initialSettings,initialSupport:s.initialSupport,interventions:s.interventions,support:s.support}
 expect(s.points.slice(0,61)).toEqual(before)
 expect(s.points[61]).toEqual(step(before[60],s.settings))
 expect(replayPlan(plan,120)).toEqual(s.points)
 expect(s.points.at(-1)!.local).toBeLessThan(run(presets['Reduced ventilation'],120).at(-1)!.local)
 const saved=snapshot(s.scenario,s.settings,[cabinSensor],s.points,0,'demo',plan)
 expect(replayPlan(JSON.parse(JSON.stringify(saved)).runPlan,120)).toEqual(s.points)
})
it('models oxygen independently without pretending that oxygen removes CO2',()=>{
 const points=run(presets.Baseline,300)
 const plain={initialSettings:presets.Baseline,initialSupport:defaultSupport,support:defaultSupport,interventions:[]}
 const adjusted={...plain,support:{oxygenTarget:21.4},interventions:[{t:60,label:'oxygen',settings:presets.Baseline,support:{oxygenTarget:21.4}}]}
 const a=supportTimeline(points,plain),b=supportTimeline(points,adjusted)
 expect(b.slice(0,61)).toEqual(a.slice(0,61))
 expect(b[300].oxygen).toBeGreaterThan(a[300].oxygen)
 expect(replayPlan(adjusted,300)).toEqual(points)
 expect(oxygenStep(20,0,21,120)).toBeCloseTo(21-Math.exp(-1),10)
})
it('preserves multiple actions at a shared timestamp and resets the intervention history',()=>{
 useSim.getState().select('Baseline')
 useSim.getState().intervene('exercise',{activity:2.5})
 useSim.getState().intervene('oxygen',{}, {oxygenTarget:21.4})
 useSim.getState().advance(60)
 const s=useSim.getState()
 expect(replayPlan({initialSettings:s.initialSettings,initialSupport:s.initialSupport,interventions:s.interventions,support:s.support},60)).toEqual(s.points)
 s.reset();expect(useSim.getState().points).toEqual([initial]);expect(useSim.getState().interventions).toEqual([])
 expect(useSim.getState().initialSettings.activity).toBe(2.5)
})
it('rejects invalid interventions and stops at the one-hour boundary',()=>{
 useSim.getState().select('Baseline');useSim.getState().intervene('bad',{}, {oxygenTarget:NaN})
 expect(useSim.getState().interventions).toHaveLength(0)
 useSim.getState().advance(3600);useSim.getState().advance(60);useSim.getState().intervene('too late',{activity:0})
 expect(useSim.getState().points.at(-1)!.t).toBe(3600)
 expect(useSim.getState().interventions).toHaveLength(0)
})
