import type { Settings } from '../simulation/engine'

const ranges = [
  {key:'ventilation',label:'Ventilation',max:1,scale:100,unit:'%'},
  {key:'scrubber',label:'CO₂ removal',max:1,scale:100,unit:'%'},
  {key:'activity',label:'Relative activity',max:3,scale:1,unit:'×'},
] as const

export function ModelEvidence({settings}:{settings:Settings}) {
  const inside = ranges.every(({key,max})=>Number.isFinite(settings[key]) && settings[key]>=0 && settings[key]<=max)
  return <section className="evidence-panel" aria-label="Model evidence">
    <h3>Evidence</h3>
    <p><strong>{inside ? 'Inside tested input bounds' : 'Extrapolating beyond tested inputs'}</strong></p>
    {ranges.map(({key,label,max,scale,unit})=><label key={key} className="evidence-range">
      <span>{label}</span><span>{Number((settings[key]*scale).toFixed(2))}{unit}</span>
      <meter min={0} max={max} value={settings[key]}/>
      <small>0{unit}–{max*scale}{unit}</small>
    </label>)}
    <p>Numerical checks cover mass balance and representative runs across these controls. Flight validation is pending.</p>
    <a href="#/research">See equations and sources</a>
  </section>
}
