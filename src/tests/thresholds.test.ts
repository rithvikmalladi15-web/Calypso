import { expect, it } from 'vitest'
import { averaged, thresholds } from '../simulation/thresholds'
import { detect, cabinSensor } from '../simulation/sensorModel'
it('requires a full NASA averaging window and converts partial pressure explicitly',()=>{
 expect(thresholds.nasa.ppm).toBeCloseTo(3947.368421)
 const points=[{t:0,cabin:5000,local:5000},{t:300,cabin:5000,local:5000},{t:3600,cabin:5000,local:5000}]
 expect(detect(points.slice(0,2),[cabinSensor],0,thresholds.nasa.ppm,3600).alert).toBeUndefined()
 expect(detect(points,[cabinSensor],0,thresholds.nasa.ppm,3600).alert).toBe(3600)
})
it('weights irregular timestamps and interpolates a rolling window boundary',()=>{
 const points=[0,2,5,8].map(t=>({t,cabin:0,local:0}))
 expect(averaged(points,[0,2,5,8],4)).toEqual([undefined,undefined,3,6])
})
