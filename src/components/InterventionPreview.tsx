import { useState } from 'react'
import { projectInterventions } from '../simulation/projection'
import { useSim } from '../stores/simulationStore'
export function InterventionPreview({disabled=false}:{disabled?:boolean}) {
  const s=useSim(),latest=s.points.at(-1)!
  const [selected,setSelected]=useState('mix')
  const forecasts=projectInterventions(latest,s.settings)
  const chosen=forecasts.find(item=>item.id===selected)!,baseline=forecasts[0]
  const change=chosen.point.local-baseline.point.local
  return <section id="intervention-preview" className="projection-panel" aria-label="Intervention comparison">
    <header><div><h2>Compare next minute</h2><p>Branch from {latest.t} s. Preview the air response before changing this run.</p></div><span className="projection-tag">Model projection · {chosen.seconds} s</span></header>
    <div className="projection-options" role="group" aria-label="Projected interventions">{forecasts.map(item=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}><span>{item.label}</span><strong>{Math.round(item.point.local).toLocaleString()} <small>ppm</small></strong><span>Breathing zone at {item.point.t} s</span></button>)}</div>
    <div className="projection-decision"><p>{selected==='hold'?'Reference: leave the current settings unchanged.':<>Projected local CO₂ is <strong>{Math.round(Math.abs(change)).toLocaleString()} ppm {change<=0?'lower':'higher'}</strong> than keeping the current settings.</>} Cabin: {Math.round(chosen.point.cabin).toLocaleString()} ppm.</p><button className="primary" disabled={disabled||s.running||selected==='hold'||latest.t>=3600||s.interventions.length>=100} onClick={()=>s.intervene(chosen.label,chosen.patch)}>Apply selected change</button></div>
    <p className="projection-note">Same two-volume equations, with each setting held constant during the projection. No physiological outcome is predicted. {s.running?'Pause to apply a comparison.':disabled?'Return to the latest sample to apply a change.':'Apply records a change now; advance time to see the result.'}</p>
  </section>
}
