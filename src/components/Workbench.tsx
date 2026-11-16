import { useState } from 'react'
import { Activity, ArrowDownToLine, AudioLines, Crosshair, Eye, EyeOff, Layers3, Pause, Play, RotateCcw, Wind } from 'lucide-react'
import { CabinDiagram, zoneName } from './CabinDiagram'
import { TelemetryChart } from './TelemetryChart'
import { initial, presets, run, type Settings } from '../simulation/engine'
import { cabinSensor, detect, isLocal, localSensor, reading, threshold } from '../simulation/sensorModel'
import { useSim } from '../stores/simulationStore'
import { snapshot, useExperiments } from '../stores/experimentStore'

const fmt = (n: number) => Math.round(n).toLocaleString()
export function Workbench({lab = false}: {lab?: boolean}) {
  const s = useSim()
  const set = useSim.setState
  const point = s.points[s.points.length-1] ?? initial
  const [air, setAir] = useState(true)
  const [heat, setHeat] = useState(true)
  const [coverage, setCoverage] = useState(lab)
  const [hidden, hide] = useState(false)
  const [instrument, setInstrument] = useState<'cabin' | 'local'>('cabin')
  const masked = hidden || instrument === 'cabin'
  const [status, setStatus] = useState('')
  const peak = s.points.reduce((max, sample) => Math.max(max, sample.local), 0)
  const timeAbove = s.points.slice(1).reduce((total, sample, index) => {
    const previous = s.points[index]
    if (sample.local >= threshold && previous.local >= threshold) return total + sample.t - previous.t
    if (sample.local < threshold && previous.local < threshold) return total
    return total + (sample.t - previous.t) * (Math.max(sample.local, previous.local) - threshold) / Math.abs(sample.local - previous.local)
  }, 0)
  const metrics = detect(s.points,s.sensors,s.noise)
  const candidates = lab && !hidden ? [
    { name:'Cabin-only layout', error:detect(s.points,[cabinSensor],s.noise).meanError },
    { name:'Two-zone layout', error:detect(s.points,[cabinSensor,localSensor],s.noise).meanError },
  ].sort((a,b)=>a.error-b.error) : []
  const move = (id: string,x: number,y: number) => set(state=>({sensors:state.sensors.map(sensor=>sensor.id===id ? {...sensor,x:Math.max(.08,Math.min(.92,x)),y:Math.max(.12,Math.min(.88,y))} : sensor)}))
  function settings(key: keyof Settings,value: number) {
    set(state=>({settings:{...state.settings,[key]:value},points:[initial],running:false}))
  }
  function save() {
    try {
      useExperiments.getState().save(snapshot(s.scenario,s.settings,s.sensors,s.points,s.noise))
      setStatus('Experiment saved locally.')
    } catch { setStatus('Experiment storage is unavailable or full.') }
  }
  return <>
    <div className="page-heading workstation-heading"><div><h1 id="simulation-heading" tabIndex={-1}>{lab ? 'Sensor Lab' : 'Cabin Simulation'}</h1><p>{lab ? 'Move virtual sensors and investigate missed local CO₂ excursions.' : 'Investigate airflow, localized CO₂ accumulation, and virtual sensor coverage.'}</p></div>
      <button onClick={save}><ArrowDownToLine size={16}/> Save experiment</button>
    </div>
    {status && <p role="status" className="notice">{status}</p>}
    <div className="bench">
      <details className="panel controls" open><summary>Experiment controls</summary>
        <div className="panel-title"><Crosshair size={16}/> Experiment controls</div>
        <div className="panel-pad">
          <label className="field">Scenario<select value={s.scenario} onChange={e=>s.select(e.target.value as keyof typeof presets)}>{Object.keys(presets).map(name=><option key={name}>{name}</option>)}</select></label>
          <div className="subheading">MODEL PARAMETERS</div>
          <label className="range-label"><span>Ventilation <b>{fmt(s.settings.ventilation*100)}%</b></span><input type="range" min="0" max="100" value={s.settings.ventilation*100} onChange={e=>settings('ventilation',+e.target.value/100)}/></label>
          <label className="range-label"><span>CO₂ removal <b>{fmt(s.settings.scrubber*100)}%</b></span><input type="range" min="0" max="100" value={s.settings.scrubber*100} onChange={e=>settings('scrubber',+e.target.value/100)}/></label>
          <label className="range-label"><span>Relative activity <b>{s.settings.activity.toFixed(1)}×</b></span><input type="range" min="0" max="3" step=".1" value={s.settings.activity} onChange={e=>settings('activity',+e.target.value)}/></label>
          <div className="divider"/>
          <div className="subheading">VIEW LAYERS</div>
          <label className="check"><Wind size={15}/> Airflow<input type="checkbox" checked={air} onChange={e=>setAir(e.target.checked)}/></label>
          <label className="check"><Layers3 size={15}/> CO₂ overlay<input type="checkbox" checked={heat} onChange={e=>setHeat(e.target.checked)}/></label>
          <label className="check"><Crosshair size={15}/> Placement halos<input type="checkbox" checked={coverage} onChange={e=>setCoverage(e.target.checked)}/></label>
        </div>
      </details>
      <section className="panel viewer">
        <div className="panel-title"><Crosshair size={16}/> Cabin view <span className="viewport-state end"><i aria-hidden="true"/>{s.running ? "Running" : "Paused"}</span></div>
        <div className="instrument-switch" role="group" aria-label="Viewport instrument"><button aria-pressed={instrument==='cabin'} onClick={()=>setInstrument('cabin')}>Cabin sensor</button><button disabled={hidden} aria-pressed={instrument==='local'} onClick={()=>setInstrument('local')}>Modeled breathing zone</button></div>
        <div className="instrument-reading" aria-describedby="instrument-description"><span>{instrument==='cabin' ? 'Cabin sensor' : 'Modeled breathing zone'}</span><strong>{fmt(instrument==='cabin' ? reading(point,cabinSensor,s.noise) : point.local)} <small>ppm</small></strong>{!masked && <span>Local − cabin · {fmt(point.local-point.cabin)} ppm</span>}</div>
        <p id="instrument-description" className="instrument-description">{hidden ? "Reveal the modeled zone after running the exercise." : masked ? "Sampling mixed cabin air" : "The dashed outline marks the modeled breathing zone."}</p>
        <CabinDiagram point={point} sensors={s.sensors} airflow={air} heat={heat} coverage={coverage} hidden={masked} playing={s.running} ventilation={s.settings.ventilation} onMove={lab ? move : undefined}/>
        <div className="playbar"><button className="primary" disabled={point.t>=3600} onClick={()=>set({running:!s.running})}>{s.running ? <Pause size={15}/> : <Play size={15}/>} {s.running ? 'Pause' : 'Run simulation'}</button>
          <button aria-label="Reset simulation" title="Reset simulation" onClick={s.reset}><RotateCcw size={15}/></button>
          <button onClick={()=>set({points:run(s.settings),running:false})}>Run 300 s</button><span className="mono end" title="Elapsed model time (10× playback)">{String(Math.floor(point.t/60)).padStart(2,'0')}:{String(point.t%60).padStart(2,'0')}</span></div>
      </section>
      <details className="panel readouts" open><summary>Telemetry</summary>
        <div className="panel-title"><AudioLines size={16}/> Live telemetry <span className={'end live '+(s.running ? 'active' : '')} aria-label={s.running ? 'Running' : 'Paused'}/></div>
        <div className="panel-pad">
          <div className="metric"><span>Cabin CO₂</span><strong>{fmt(point.cabin)} <small>ppm</small></strong></div>
          <div className="metric local"><span>Breathing-zone CO₂</span><strong>{hidden ? 'Masked' : <>{fmt(point.local)} <small>ppm</small></>}</strong></div>
          <div className="metric compact"><span>Local − cabin</span><strong>{hidden ? '—' : fmt(point.local-point.cabin)} <small>ppm</small></strong></div>
          <div className="rail-chart"><TelemetryChart data={s.points} series={[{key:'cabin',label:'Cabin'},...(!hidden ? [{key:'local',label:'Breathing zone'}] : [])]} unit="ppm"/></div>
          <div className="divider"/>
          <div className="subheading">VIRTUAL SENSORS</div>
          {s.sensors.map(sensor=><div className="sensor-read" key={sensor.id}><span>{sensor.id} · {hidden ? 'Virtual' : zoneName(sensor)}</span><b>{fmt(reading(point,sensor,s.noise))} ppm</b></div>)}
          {!hidden && metrics.truth != null && metrics.alert == null && <div className="notice">Local crossing missed by sensors</div>}
        </div>
      </details>
    </div>
    <section className="panel timeline">
      <div className="panel-title"><Activity size={16}/> CO₂ timeline <span className="micro end">MODEL OUTPUT · PPM</span></div>
      <div className="panel-pad">
        <div className="legend"><span className="cyan">● Cabin</span>{!hidden && <span>● Breathing zone</span>}<span>Elapsed model time (s)</span></div>
        <TelemetryChart data={s.points} series={[{key:'cabin',label:'Cabin'},...(!hidden?[{key:'local',label:'Breathing zone'}]:[])]} unit="ppm"/>
      </div>
    </section>
    <details className="panel section" open><summary>{lab ? "Sensor placement and detection" : "Detection events"}</summary>
      <div className="section-title"><h2>{lab ? 'Sensor placement' : 'Detection events'}</h2>{lab && <button onClick={()=>{if(!hidden) {s.select('Reduced ventilation'); set({sensors:[cabinSensor]})} hide(!hidden); setInstrument(hidden ? 'local' : 'cabin')}}>{hidden ? <Eye size={16}/> : <EyeOff size={16}/>} {hidden?'Reveal modeled zone':'Start masked exercise'}</button>}</div>
      <p>First sample at or above {threshold.toLocaleString()} ppm triggers an educational alert. Layout and noise changes are evaluated against the entire recorded run.</p>
      <div className="stats"><div>First sensor alert <b>{metrics.alert != null ? metrics.alert+' s' : 'None'}</b></div>{!hidden && <><div>Peak local CO₂ <b>{fmt(peak)} ppm</b></div><div>Time at or above threshold <b>{timeAbove.toFixed(1)} s</b></div><div>First local crossing <b>{metrics.truth != null ? metrics.truth+' s' : 'None'}</b></div><div>Mean absolute error <b>{fmt(metrics.meanError)} ppm</b></div><div>Alert minus crossing <b>{metrics.delay != null ? metrics.delay+' s' : metrics.truth != null ? 'Missed' : 'No local crossing'}</b></div></>}</div>
      {!hidden && <p>Duration uses linear interpolation between samples. Mean absolute error compares the highest sensor reading at each sample with modeled breathing-zone CO₂.</p>}
      {lab && <>
        <div className="actions"><button onClick={()=>set({sensors:[cabinSensor]})}>Cabin only</button><button onClick={()=>set({sensors:[cabinSensor,localSensor]})}>Cabin + breathing zone</button></div>
        <p>Drag markers on the schematic or adjust positions below. The zone boundary assigns each reading. Marker halos indicate location only.</p>
        {s.sensors.map(sensor=><div className="mapping" key={sensor.id}><b>{sensor.id}</b><label>Place sensor<select aria-label={sensor.id+' placement'} value={isLocal(sensor)?'local':'cabin'} onChange={e=>{const target=e.target.value==='local'?localSensor:cabinSensor;move(sensor.id,target.x,target.y)}}><option value="cabin">Cabin</option><option value="local">Breathing zone</option></select></label><label>X position <input type="range" min={8} max={92} value={sensor.x*100} onChange={e=>move(sensor.id,+e.target.value/100,sensor.y)}/></label><label>Y position <input type="range" min={12} max={88} value={sensor.y*100} onChange={e=>move(sensor.id,sensor.x,+e.target.value/100)}/></label></div>)}
        <label className="range-label">Deterministic noise amplitude · {s.noise} ppm<input type="range" min="0" max="500" step="10" value={s.noise} onChange={e=>set({noise:+e.target.value})}/></label>
        {candidates.length > 0 && <><h3>Candidate layouts ranked by mean error</h3><div className="stats">{candidates.map(layout=><div key={layout.name}>{layout.name}<b>{fmt(layout.error)} ppm mean error</b></div>)}</div></>}
      </>}
    </details>
  </>
}
