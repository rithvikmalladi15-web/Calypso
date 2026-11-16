import type { Point } from './engine'
export const thresholds = {
  demo: {label:'Demo rule · 1,250 ppm',ppm:1250,windowSeconds:0,source:'',description:'Educational first-sample alert rule. Not a NASA limit or a health assessment.'},
  nasa: {label:'NASA cabin reference · 3 mmHg, 1 h average',ppm:3/760*1e6,windowSeconds:3600,source:'https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/',description:'NASA-STD-3001 Vol. 2, §6.2.1.3 [V2 6004]: nominal habitable-volume CO₂, one-hour average ≤3 mmHg. Converted to ppm assuming 760 mmHg total pressure. Comparing the local model is exploratory; it does not establish compliance.'},
} as const
export type ThresholdId = keyof typeof thresholds
// Trapezoidal integration with interpolation at the window boundary; no partial windows.
export function averaged(points:Point[], values:number[], seconds:number):(number|undefined)[] {
  if (!seconds) return values
  const integral=[0]
  for(let i=1;i<points.length;i++) integral[i]=integral[i-1]+(points[i].t-points[i-1].t)*(values[i-1]+values[i])/2
  let left=0
  return points.map((point,i)=>{
    const start=point.t-seconds
    if(start<points[0].t) return undefined
    while(left+1<i&&points[left+1].t<=start) left++
    const dt=start-points[left].t
    const span=points[left+1]?.t-points[left].t
    const boundary=values[left]+(span?dt/span*(values[left+1]-values[left]):0)
    const before=integral[left]+dt*(values[left]+boundary)/2
    return (integral[i]-before)/seconds
  })
}
