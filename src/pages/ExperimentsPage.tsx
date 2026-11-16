import { defaultSupport, replayPlan, supportTimeline } from '../simulation/lifeSupport'
import { thresholds } from '../simulation/thresholds'
import { useState, type FormEvent } from 'react'
import { routeHref } from '../app/router'
import { explain } from '../ai/deterministicExplainer'
import { TelemetryChart } from '../components/TelemetryChart'
import { sources } from '../data/sourceRegistry'
import { downloadReport } from '../lib/exportReport'
import { run } from '../simulation/engine'
import { useSim } from '../stores/simulationStore'
import { limitations, snapshot, useExperiments, type Experiment } from '../stores/experimentStore'

const ppm = (n: number) => Math.round(n).toLocaleString()+' ppm'
export function ExperimentsPage({report = false}: {report?:boolean}) {
  const {records,notes,save,remove,note}=useExperiments()
  const [selected,setSelected]=useState('')
  const [comparison,setComparison]=useState('')
  const [text,setText]=useState('')
  const [error,setError]=useState('')
  const current=records.find(r=>r.id===selected) ?? records[0]
  const other=records.find(r=>r.id===comparison && r.id!==current?.id)
  function mutate(action: ()=>void) {
    try { action(); setError('') } catch { setError('Local storage is unavailable or full.') }
  }
  function load(record: Experiment, replay: boolean) {
    useSim.setState({initialSettings:record.runPlan?.initialSettings??record.settings,initialSupport:record.runPlan?.initialSupport??defaultSupport,support:record.runPlan?.support??defaultSupport,interventions:record.runPlan?.interventions??[],thresholdId:record.thresholdId??'demo',scenario:record.scenario,settings:record.settings,sensors:record.sensors,noise:record.noise,points:replay ? record.runPlan ? replayPlan(record.runPlan,record.points.at(-1)!.t) : run(record.settings,record.points.length-1) : record.points,running:false})
    location.hash=routeHref('Simulation')
  }
  function log(e: FormEvent) {
    e.preventDefault()
    if (text.trim()) mutate(()=>{note(text.trim());setText('')})
  }
  return <>
    <div className="page-heading"><h1>{report?'Reports':'Experiments'}</h1><p>{report?'Review a saved run and export its settings, methods, and results.':'Reopen a saved run or compare two runs side by side.'}</p></div>
    {error && <p className="notice" role="alert">{error}</p>}
    {!current ? <section className="panel section"><h2>No experiments saved</h2><p>Run a scenario and save it from the simulation workbench.</p><a className="button" href={routeHref('Simulation')}>Open simulation</a></section> : <>
      <section className="panel section no-print">
        <div className="section-title"><h2>Saved runs</h2><span className="micro">{records.length} / 10 LOCAL RECORDS</span></div>
        <div className="actions">
          <select aria-label="Saved run" value={current.id} onChange={e=>setSelected(e.target.value)}>{records.map(r=><option key={r.id} value={r.id}>{r.scenario} · {new Date(r.date).toLocaleString()}</option>)}</select>
          <select aria-label="Comparison run" value={other?.id ?? ''} onChange={e=>setComparison(e.target.value)}><option value="">Choose comparison run</option>{records.filter(r=>r.id!==current.id).map(r=><option key={r.id} value={r.id}>{r.scenario} · {new Date(r.date).toLocaleString()}</option>)}</select>
        </div>
        <div className="actions">{report ? <button className="primary" onClick={()=>window.print()}>Print / Save PDF</button> : <>
          <button onClick={()=>load(current,false)}>Load run</button><button onClick={()=>load(current,true)}>Replay run</button>
          <button onClick={()=>mutate(()=>{const copy=snapshot(current.scenario,current.settings,current.sensors,current.points,current.noise,current.thresholdId,current.runPlan);save(copy);setSelected(copy.id)})}>Duplicate</button>
          <button onClick={()=>mutate(()=>remove(current.id))}>Delete</button>
        </>}<button onClick={()=>downloadReport(current)}>Export JSON</button></div>
      </section>
      <div className={other ? 'compare' : ''}>{[current,...(other?[other]:[])].map((r,i)=>{
        const last=r.points[r.points.length-1]
        return <section className="panel section" key={r.id}><span className="micro">{i?'COMPARISON':'PRIMARY'} · MODELED TELEMETRY</span><h2>{r.scenario}</h2><p>{r.date} · Model {r.version} · {last.t} s</p>
          <div className="stats"><div>Final cabin <b>{ppm(last.cabin)}</b></div><div>Final breathing zone <b>{ppm(last.local)}</b></div><div>Mean detection error <b>{ppm(r.metrics.meanError)}</b></div></div>
          <TelemetryChart data={r.points} series={[{key:'cabin',label:'Cabin'},{key:'local',label:'Breathing zone'}]} unit="ppm"/>
          {r.runPlan&&<p>Illustrative final cabin O₂: {supportTimeline(r.points,r.runPlan).at(-1)!.oxygen.toFixed(3)}%. This is not blood oxygen saturation.</p>}
          <h3>Reproducibility</h3><p>Reference: {thresholds[r.thresholdId??"demo"].label}. {thresholds[r.thresholdId??"demo"].description}</p><p>Initial cabin {ppm(r.initial.cabin)} · initial breathing zone {ppm(r.initial.local)} · ventilation {Math.round(r.settings.ventilation*100)}% · removal {Math.round(r.settings.scrubber*100)}% · source {r.settings.activity}× · noise {r.noise} ppm</p>
          <p>{r.sensors.map(s=>s.id+' ('+s.x.toFixed(2)+', '+s.y.toFixed(2)+')').join(' · ')}</p>
          {r.runPlan&&<><h3>Intervention history</h3><p>Starting ventilation {r.runPlan.initialSettings.ventilation*100}%, removal {r.runPlan.initialSettings.scrubber*100}%, activity {r.runPlan.initialSettings.activity}×. Initial O₂ target {r.runPlan.initialSupport.oxygenTarget}%. Changes apply after the recorded sample.</p><ol>{r.runPlan.interventions.map((event,index)=><li key={index}>{event.t} s · {event.label} · ventilation {Math.round(event.settings.ventilation*100)}%, removal {Math.round(event.settings.scrubber*100)}%, activity {event.settings.activity}×, O₂ target {event.support.oxygenTarget}%</li>)}</ol></>}
          <h3>Deterministic interpretation</h3>{explain(r).map(line=><p key={line}>{line}</p>)}
        </section>
      })}</div>
      <section className="panel section"><h2>{report?'Methods and limitations':'Ventilation sensitivity'}</h2>
        {report ? <><p>{limitations} The model report contains simulated output. NASA environmental observations are explored in the separate NASA Data view.</p><p>The simulation exchanges CO₂ between two effective volumes and removes CO₂ from the cabin. The local source scales with relative activity. One-second integration steps produce the time series.</p>{sources.filter(s=>current.sourceIds.includes(s.id)).map(s=><p key={s.id}><a href={s.url}>{s.title} · {s.section}</a></p>)}</> :
        <><p>Static sensitivity using the saved final settings for the entire duration. This does not replay the intervention history.</p><div className="stats">{[-.1,0,.1].map(delta=>{
          const ventilation=Math.max(0,Math.min(1,current.settings.ventilation+delta))
          const series=run({...current.settings,ventilation},current.points.length-1)
          return <div key={delta}>{Math.round(ventilation*100)}% ventilation <b>{ppm(series[series.length-1].local)}</b></div>
        })}</div></>}
      </section>
    </>}
    {!report && <section className="panel section"><h2>Fictional crew observations</h2><p>Record educational observations linked by time to your investigation.</p><form className="actions" onSubmit={log}><input aria-label="Fictional crew observation" maxLength={500} value={text} onChange={e=>setText(e.target.value)} placeholder="Add an observation"/><button disabled={!text.trim()}>Log observation</button></form>{notes.map(n=><article key={n.id} className="source"><span className="micro">{new Date(n.date).toLocaleString()}</span><p>{n.text}</p></article>)}</section>}
  </>
}
