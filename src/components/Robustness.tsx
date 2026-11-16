import { useEffect, useRef, useState } from 'react'
import { defaultSweep, sweepCsv, type SweepCell } from '../simulation/robustness'
import { download } from '../lib/chartDownloads'
export function Robustness() {
  const [cells,setCells]=useState<SweepCell[]>([])
  const [status,setStatus]=useState('')
  const [pending,setPending]=useState(false)
  const worker=useRef<Worker|null>(null)
  useEffect(()=>()=>worker.current?.terminate(),[])
  function start() {
    worker.current?.terminate();setPending(true);setStatus('Running 36 settings in a background worker…')
    try {
      const task=new Worker(new URL('../simulation/robustness.worker.ts',import.meta.url),{type:'module'});worker.current=task
      task.onmessage=(event:MessageEvent<{cells?:SweepCell[];error?:string}>)=>{setPending(false);setStatus(event.data.error??'Sweep complete.');setCells(event.data.cells??[]);task.terminate()}
      task.onerror=event=>{event.preventDefault();setPending(false);setStatus('Worker failed. Retry the sweep.');task.terminate()}
      task.postMessage(defaultSweep)
    } catch {setPending(false);setStatus('This browser cannot start the required Web Worker.')}
  }
  return <details className="panel section robustness"><summary>Robustness · sensitivity sweep</summary>
    <h2>Does sensor placement hold across settings?</h2>
    <p>6 × 6 grid · Ventilation 0–100% in 20% steps · Relative activity 0–3× in 0.6× steps. Removal fixed at 65%, duration 300 s, noise 0 ppm, both volumes initially 650 ppm. Uses the 1,250 ppm demonstration rule.</p>
    <div className="actions"><button disabled={pending} onClick={start}>{pending?'Running…':'Run robustness sweep'}</button><button disabled={!cells.length||pending} onClick={()=>download(new Blob([sweepCsv(defaultSweep,cells)],{type:'text/csv'}),'calypso-robustness.csv')}>Export grid CSV</button></div>
    <p role="status">{status}</p>
    {!!cells.length && <>
      <p><strong>Cabin sensor missed the threshold in {cells.filter(c=>c.crossing!=null&&c.cabin==null).length} of {cells.length} tested settings.</strong> {cells.filter(c=>c.crossing==null).length} settings had no local crossing.</p>
      <p>Delay = first sensor detection − first local crossing, in seconds. Never = local crossing but no sensor detection within 300 s; — = no local crossing. This grid describes illustrative coefficients, not flight reliability.</p>
      {(['cabin','local'] as const).map(sensor=><section key={sensor}><h3>{sensor==='cabin'?'Cabin sensor':'Breathing-zone sensor'} detection delay</h3><div className="sweep-grid" role="table" aria-label={sensor+' detection delay heatmap'}>
        <div role="row" className="sweep-row"><span role="columnheader">Activity ↓<br/>Vent. →</span>{defaultSweep.ventilation.map(v=><span role="columnheader" key={v}>{Math.round(v*100)}%</span>)}</div>
        {defaultSweep.activity.map(activity=><div role="row" className="sweep-row" key={activity}><span role="rowheader">{activity}×</span>{cells.filter(c=>c.activity===activity).map(c=>{
          const delay=sensor==='cabin'?c.cabinDelay:c.localDelay
          const missed=c.crossing!=null&&c[sensor]==null
          return <span role="cell" key={c.ventilation} className={missed?'sweep-missed':''} style={!missed&&delay!=null?{background:`rgba(128,183,232,${.12+.65*Math.min(1,Math.max(0,delay)/300)})`}:undefined} title={`Ventilation ${c.ventilation*100}%, activity ${activity}×. Local crossing ${c.crossing??'none'}; detection ${c[sensor]??'none'}.`}>{c.crossing==null?'—':missed?'Never':delay+' s'}</span>
        })}</div>)}
      </div></section>)}
    </>}
  </details>
}
