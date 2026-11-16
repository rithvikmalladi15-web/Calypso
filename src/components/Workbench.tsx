import { CrewHealthPanel } from './CrewHealthPanel'
import { thresholds } from '../simulation/thresholds'
import { Robustness } from './Robustness'
import { MeasurementCatalog } from './MeasurementCatalog'
import { ModelEvidence } from './ModelEvidence'
import { useScenarioSolver } from '../simulation/useScenarioSolver'
import { download, downloadChart } from '../lib/chartDownloads'
import { readScenario, scenarioUrl } from '../simulation/scenarioLink'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownToLine, AudioLines, Crosshair, Eye, EyeOff, Layers3, Pause, Play, RotateCcw } from 'lucide-react'
import { zoneName } from './CabinDiagram'
import { CabinView } from './CabinView'
import { TelemetryChart } from './TelemetryChart'
import { initial, presets, run, type Settings } from '../simulation/engine'
import { cabinSensor, detect, isLocal, localSensor, reading } from '../simulation/sensorModel'
import { useSim } from '../stores/simulationStore'
import { snapshot, useExperiments } from '../stores/experimentStore'

const latestDuration = (points: {t:number}[]) => (points.at(-1)?.t??0)-(points[0]?.t??0)
const fmt = (n: number) => Math.round(n).toLocaleString()
export function Workbench({lab = false}: {lab?: boolean}) {
  const s = useSim()
  const rule = thresholds[s.thresholdId]
  const threshold = rule.ppm
  const eligible = latestDuration(s.points) >= rule.windowSeconds
  const set = useSim.setState
  const solver = useScenarioSolver(s.settings)
  const [cursor, setCursor] = useState<number | null>(null)
  const latest = s.points[s.points.length-1] ?? initial
  const point = s.points[Math.min(cursor ?? s.points.length - 1, s.points.length - 1)] ?? initial
  useEffect(() => { if (s.running || s.points.length === 1) setCursor(null) }, [s.running,s.points.length])
  const [heat, setHeat] = useState(true)
  const [coverage, setCoverage] = useState(lab)
  const [hidden, hide] = useState(false)
  useEffect(()=>{set({masked:hidden});return()=>{set({masked:false})}},[hidden,set])
  const [instrument, setInstrument] = useState<'cabin' | 'local'>('cabin')
  const masked = hidden || instrument === 'cabin'
  const [status, setStatus] = useState('')
  const [compare, setCompare] = useState(false)
  const [sharedLink, setSharedLink] = useState('')
  const crew = useRef<HTMLElement>(null)
  const chart = useRef<HTMLElement>(null)
  useEffect(()=>{
    let frame=0
    const showCrew=()=>{if(location.hash.startsWith("#/crew-health"))frame=requestAnimationFrame(()=>crew.current?.scrollIntoView({block:"start"}))}
    showCrew()
    window.addEventListener('hashchange',showCrew)
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('hashchange',showCrew)}
  },[])
  const viewport = useRef<HTMLElement>(null)
  const ventilationInput = useRef<HTMLInputElement>(null)
  function editCustom() {
    set({scenario:'Custom'})
    ventilationInput.current?.focus()
  }
  const [controlsOpen, setControlsOpen] = useState(()=>typeof matchMedia === 'undefined' || !matchMedia('(max-width:600px)').matches)
  useEffect(()=>{
    if (lab) return
    function restoreScenario() {
      if (!location.hash.startsWith('#/simulation?')) return
      const settings = readScenario(location.hash)
      if (settings) {
        set({settings,scenario:'Custom',points:[initial],running:false})
        setStatus('Shared scenario loaded.')
      } else setStatus('This scenario link contains missing or out-of-range settings.')
    }
    restoreScenario()
    window.addEventListener('hashchange',restoreScenario)
    return ()=>window.removeEventListener('hashchange',restoreScenario)
  },[lab,set])
  const baseline = useMemo(()=>run(presets.Baseline,latest.t),[latest.t])
  const reference = baseline[point.t] ?? initial
  const chartData = useMemo(()=>compare && !hidden
    ? s.points.map((sample,index)=>({...sample,baselineLocal:baseline[index]?.local}))
    : s.points,[compare,hidden,s.points,baseline])
  const sensorChartData = chartData.map(sample=>({...sample,...Object.fromEntries(s.sensors.map(sensor=>[sensor.id,reading(sample,sensor,s.noise)]))}))
  const delta = (value:number, referenceValue:number) => {
    const change = Math.round(value-referenceValue)
    return change === 0 ? 'No change' : (change > 0 ? '↑ +' : '↓ −')+Math.abs(change)+' ppm'
  }
  async function copyScenario() {
    const link = scenarioUrl(s.settings)
    setSharedLink(link)
    try { await navigator.clipboard.writeText(link); setStatus('Copied!') }
    catch { setStatus('Copy the scenario URL from the field below.') }
  }
  function exportCsv() {
    const rows = s.points.map(sample=>hidden ? [sample.t,sample.cabin] : [sample.t,sample.cabin,sample.local])
    const headings = hidden ? 'elapsed_s,cabin_co2_ppm' : 'elapsed_s,cabin_co2_ppm,breathing_zone_co2_ppm'
    download(new Blob([[headings,...rows.map(row=>row.join(','))].join('\n')],{type:'text/csv'}),'calypso-co2.csv')
  }
  async function exportPng(kind:'chart'|'cabin') {
    if(kind==='cabin' && viewport.current?.querySelector('.scene-canvas canvas')){viewport.current.querySelector<HTMLButtonElement>('[data-export-3d]')?.click();return}
    const svg = kind === 'cabin' ? viewport.current?.querySelector('svg.cabin') : chart.current?.querySelector('svg.recharts-surface')
    if (!(svg instanceof SVGSVGElement)) { setStatus('Chart is unavailable.'); return }
    try { await downloadChart(svg,kind === 'cabin' ? 'calypso-cabin.png' : undefined) } catch { setStatus('Could not export the chart as PNG.') }
  }
  const peak = s.points.reduce((max, sample) => Math.max(max, sample.local), 0)
  const timeAbove = s.points.slice(1).reduce((total, sample, index) => {
    const previous = s.points[index]
    if (sample.local >= threshold && previous.local >= threshold) return total + sample.t - previous.t
    if (sample.local < threshold && previous.local < threshold) return total
    return total + (sample.t - previous.t) * (Math.max(sample.local, previous.local) - threshold) / Math.abs(sample.local - previous.local)
  }, 0)
  const runSummary = useMemo(() => {
    const first = s.points[0] ?? initial
    const last = s.points.at(-1) ?? initial
    let cabinMin = first.cabin, cabinMax = first.cabin, cabinIntegral = 0
    let localMin = first.local, localIntegral = 0, maxGap = first.local - first.cabin
    for (const [index, sample] of s.points.entries()) {
      cabinMin = Math.min(cabinMin,sample.cabin)
      cabinMax = Math.max(cabinMax,sample.cabin)
      localMin = Math.min(localMin,sample.local)
      maxGap = Math.max(maxGap,sample.local-sample.cabin)
      const previous = s.points[index-1]
      if (!previous) continue
      const duration = sample.t-previous.t
      cabinIntegral += duration*(sample.cabin+previous.cabin)/2
      localIntegral += duration*(sample.local+previous.local)/2
    }
    const duration = last.t-first.t
    return {duration,cabinMin,cabinMax,localMin,maxGap,
      cabinMean:duration>0 ? cabinIntegral/duration : first.cabin,
      localMean:duration>0 ? localIntegral/duration : first.local,
      cabinChange:last.cabin-first.cabin,localChange:last.local-first.local}
  }, [s.points])
  const metrics = detect(s.points,s.sensors,s.noise,threshold,rule.windowSeconds)
  const candidates = lab && !hidden ? [
    { name:'Cabin-only layout', error:detect(s.points,[cabinSensor],s.noise,threshold,rule.windowSeconds).meanError },
    { name:'Two-zone layout', error:detect(s.points,[cabinSensor,localSensor],s.noise,threshold,rule.windowSeconds).meanError },
  ].sort((a,b)=>a.error-b.error) : []
  const move = (id: string,x: number,y: number) => set(state=>({sensors:state.sensors.map(sensor=>sensor.id===id ? {...sensor,x:Math.max(.08,Math.min(.92,x)),y:Math.max(.12,Math.min(.88,y))} : sensor)}))
  function settings(key: keyof Settings,value: number) {
    if (!Number.isFinite(value) || value < 0 || value > (key === 'activity' ? 3 : 1)) {
      setStatus('Choose a value within the shown range.')
      return
    }
    set(state=>({scenario:'Custom',settings:{...state.settings,[key]:value},points:[initial],running:false}))
  }
  function save() {
    try {
      useExperiments.getState().save(snapshot(s.scenario,s.settings,s.sensors,s.points,s.noise,s.thresholdId))
      setStatus('Experiment saved locally.')
    } catch { setStatus('Experiment storage is unavailable or full.') }
  }
  return <>
    <div className="page-heading workstation-heading"><div><h1 id="simulation-heading" tabIndex={-1}>{lab ? 'Sensor Lab' : 'Cabin Simulation'}</h1><p>{lab ? 'Move virtual sensors and investigate missed local CO₂ excursions.' : 'Run a scenario, compare cabin and breathing-zone CO₂, then test your sensor layout.'}</p></div>
      <div className="actions">{!lab && <button onClick={()=>crew.current?.scrollIntoView({behavior:"instant",block:"start"})}>Crew Health</button>}<a className="button" href="#co2-timeline" onClick={event=>{event.preventDefault();chart.current?.scrollIntoView({behavior:'instant',block:'start'})}}>View graphs</a><button onClick={save} disabled={hidden} title={hidden ? "Reveal the modeled zone before saving the full run" : undefined}><ArrowDownToLine size={16}/> Save experiment</button></div>
    </div>
    {status && <p role="status" className="notice">{status}</p>}
    <div className="bench">
      <details className="panel controls" open={controlsOpen} onToggle={event=>setControlsOpen(event.currentTarget.open)}>
        <summary>Experiment controls</summary>

        <div className="panel-pad">
          <label className="field">Scenario<select value={s.scenario in presets ? s.scenario : 'Custom'} onChange={e=>{const preset=e.target.value;if(preset==='Custom')editCustom();else s.select(preset as keyof typeof presets)}}>{Object.keys(presets).map(name=><option key={name}>{name}</option>)}<option value="Custom">{s.scenario in presets || s.scenario==='Custom' ? 'Custom' : s.scenario}</option></select></label>
          {!(s.scenario in presets) && <div className="custom-settings">
            <p>Custom starts with the current settings. Changing a value pauses the run and resets its clock. Select Run 300 s to test your settings.</p>
            <button type="button" onClick={editCustom}>Edit custom settings</button>
          </div>}
          <label className="field">Threshold reference<select value={s.thresholdId} onChange={e=>set({thresholdId:e.target.value as keyof typeof thresholds})}>{Object.entries(thresholds).map(([id,item])=><option key={id} value={id}>{item.label}</option>)}</select></label>
          <p title={rule.description}>{rule.description} {rule.source && <a href={rule.source} target="_blank" rel="noreferrer" title={rule.description}>NASA source ↗</a>}</p>
          {rule.windowSeconds>0 && <p>{eligible?'Full averaging window available.':'Insufficient duration: 3,600 s required for a full one-hour average.'} The raw chart reference is approximately {Math.round(threshold).toLocaleString()} ppm at assumed sea-level pressure. TODO: verify mission-specific off-nominal limits before adding them.</p>}
          <div className="subheading">MODEL PARAMETERS</div>
          <label className="range-label"><span>Ventilation <b>{fmt(s.settings.ventilation*100)}%</b></span><input ref={ventilationInput} title="Air mixing strength. Baseline: 65%." type="range" min="0" max="100" value={s.settings.ventilation*100} onChange={e=>settings('ventilation',+e.target.value/100)}/></label>
          <label className="range-label"><span>CO₂ removal <b>{fmt(s.settings.scrubber*100)}%</b></span><input title="Cabin CO₂ removal strength. Baseline: 65%." type="range" min="0" max="100" value={s.settings.scrubber*100} onChange={e=>settings('scrubber',+e.target.value/100)}/></label>
          <label className="range-label"><span>Relative activity <b>{s.settings.activity.toFixed(1)}×</b></span><input title="CO₂ production relative to resting activity. Baseline: 1×." type="range" min="0" max="3" step=".1" value={s.settings.activity} onChange={e=>settings('activity',+e.target.value)}/></label>
          <button onClick={()=>{s.select('Baseline');setStatus('Baseline parameters restored.')}}>Reset parameters</button>
          {!lab && <><button onClick={()=>void copyScenario()}>Copy scenario link</button>{sharedLink && <label className="field">Scenario URL<input value={sharedLink} readOnly onFocus={event=>event.target.select()}/></label>}</>}
          <div className="divider"/>
          <div className="subheading">VIEW LAYERS</div>
          <label className="check"><Layers3 size={15}/> CO₂ overlay<input type="checkbox" checked={heat} onChange={e=>setHeat(e.target.checked)}/></label>
          <label className="check"><Crosshair size={15}/> Placement halos<input type="checkbox" checked={coverage} onChange={e=>setCoverage(e.target.checked)}/></label>
        </div>
      </details>
      <section ref={viewport} className="panel viewer">
        <div className="panel-title"><Crosshair size={16}/> Cabin view <span className="viewport-state end"><i aria-hidden="true"/>{s.running ? "Running" : "Paused"}</span></div>
        <div className="instrument-switch" role="group" aria-label="Viewport instrument"><button aria-pressed={instrument==='cabin'} onClick={()=>setInstrument('cabin')}>Cabin sensor</button><button disabled={hidden} aria-pressed={instrument==='local'} onClick={()=>setInstrument('local')}>Modeled breathing zone</button></div>
        <div className="playbar"><button className="primary" disabled={solver.pending || (!s.running && latest.t>=3600)} onClick={()=>set({running:!s.running})}>{s.running ? <Pause size={15}/> : <Play size={15}/>} {s.running ? 'Pause' : 'Run simulation'}</button>
          <button aria-label="Reset simulation" title="Reset simulation" disabled={solver.pending} onClick={s.reset}><RotateCcw size={15}/></button>
          <button disabled={solver.pending || s.running || latest.t>=3600} onClick={s.tick}>Step 1 s</button>
          <select aria-label="Playback speed" value={s.speed} onChange={event=>set({speed:Number(event.target.value)})}>{[.5,1,2,4].map(speed=><option key={speed} value={speed}>{speed}×</option>)}</select>
          <button disabled={solver.pending} onClick={()=>{
            set({running:false})
            solver.solve(points=>{setCursor(null);set({points,running:false})})
          }}>{solver.pending ? 'Solving…' : 'Run 300 s'}</button>{rule.windowSeconds>0 && <button disabled={solver.pending} onClick={()=>{set({running:false});solver.solve(points=>set({points,running:false}),3600)}}>Run 3,600 s</button>}<span className="mono end" title="Elapsed model time">{String(Math.floor(latest.t/60)).padStart(2,'0')}:{String(latest.t%60).padStart(2,'0')}</span></div>
        <div className="instrument-reading" aria-describedby="instrument-description"><span>{instrument==='cabin' ? 'Cabin sensor' : 'Modeled breathing zone'}</span><strong>{fmt(instrument==='cabin' ? reading(point,cabinSensor,s.noise) : point.local)} <small>ppm</small></strong>{!masked && <span>Local − cabin · {fmt(point.local-point.cabin)} ppm</span>}</div>
        <p id="instrument-description" className="instrument-description">{hidden ? "Reveal the modeled zone after running the exercise." : masked ? "Sampling mixed cabin air" : "The dashed outline marks the modeled breathing zone."}</p>
        <dl className="instrument-strip">
          <div><dt>Cabin</dt><dd>{fmt(point.cabin)} ppm</dd></div>
          {!masked && <><div><dt>Modeled local</dt><dd>{fmt(point.local)} ppm</dd></div><div><dt>Local difference</dt><dd>{fmt(point.local-point.cabin)} ppm</dd></div></>}
          <div><dt>Sample time</dt><dd>{point.t} s</dd></div>
        </dl>
        <div className="detection-readout" role="status">{!eligible ? 'Awaiting 1 h of samples' : metrics.alert != null ? `Detected at ${metrics.alert} s` : `Not detected in ${latest.t} s`}<small>Current sensor layout · {rule.windowSeconds ? "one-hour average reference" : "demo rule"}</small></div>
    <section ref={chart} id="co2-timeline" className="panel timeline">
      <div className="panel-title"><Activity size={16}/> CO₂ timeline <span className="micro end">MODEL OUTPUT · PPM</span></div>
      <div className="panel-pad">
        <details className="chart-tools"><summary>Compare &amp; export</summary><div className="actions">
          <button onClick={()=>void exportPng('cabin')}>Export cabin PNG</button>
          {!hidden && <label className="check"><input type="checkbox" checked={compare} onChange={event=>setCompare(event.target.checked)}/> Compare against baseline</label>}
          <button onClick={exportCsv}>Export CSV</button><button onClick={()=>void exportPng('chart')}>Export chart PNG</button>
        </div></details>
        {!hidden && <div className="stats">
          <div>Cabin CO₂ <b>{fmt(point.cabin)} ppm</b>{delta(point.cabin,reference.cabin)} vs baseline</div>
          <div>Breathing zone <b>{fmt(point.local)} ppm</b>{delta(point.local,reference.local)} vs baseline</div>
          <div>Local minus cabin <b>{fmt(point.local-point.cabin)} ppm</b>{delta(point.local-point.cabin,reference.local-reference.cabin)} vs baseline</div>
        </div>}
        <div className="timeline-inspect">
          <label className="field">Inspect sample · {point.t} s<input type="range" min={0} max={s.points.length-1} disabled={s.running || s.points.length<2} value={point.t} onChange={event=>setCursor(Number(event.target.value))}/></label>
          {cursor !== null && <button onClick={()=>setCursor(null)}>Return to latest</button>}
        </div>
        <TelemetryChart cursor={point.t} data={sensorChartData} series={[{key:'cabin',label:'Cabin'},...s.sensors.map(sensor=>({key:sensor.id,label:sensor.id+' sensor'})),...(!hidden?[{key:'local',label:'Breathing zone'}]:[]),...(compare && !hidden ? [{key:'baselineLocal',label:'Baseline breathing zone'}] : [])]} unit="ppm" threshold={threshold} thresholdLabel={rule.windowSeconds ? "NASA reference · 1 h average" : "Demo rule"} events={[{time:metrics.alert,label:'First sensor detection'},...(!hidden ? [{time:metrics.truth,label:'First local crossing'}] : [])]}/>
        {!hidden && <p>At {point.t} s, local CO₂ is {fmt(Math.abs(point.local-point.cabin))} ppm {point.local>=point.cabin ? 'above or equal to' : 'below'} the cabin reading. Ventilation mixes the two air volumes, while activity adds CO₂ near the astronaut.</p>}
        <span className="sr-only" role="status">{!s.running && !hidden ? `Paused at ${point.t} seconds. Local CO₂ ${fmt(point.local)} ppm.` : ''}</span>
      </div>
    </section>
        <CabinView noise={s.noise} point={point} sensors={s.sensors} airflow={false} heat={heat} coverage={coverage} hidden={masked} playing={s.running} ventilation={s.settings.ventilation} onMove={lab && !hidden ? move : undefined}/>
        {solver.pending && <div className="solve-placeholder" role="status">Computing the run…</div>}

        <p className="schematic-disclosure">Conceptual schematic, not a spatial simulation.</p>
        <p className="simulation-caption">{hidden ? 'The cabin sensor is all you can see. Reveal the modeled breathing zone to compare.' : metrics.truth != null && metrics.alert == null ? 'The modeled breathing zone crossed the selected reference. The current sensors have yet to alert.' : metrics.truth != null && metrics.alert != null ? `The modeled zone crossed at ${metrics.truth} s. A sensor first alerted at ${metrics.alert} s.` : !eligible ? 'A complete one-hour averaging window is required before assessing this reference.' : 'No modeled local crossing of the selected reference so far.'}</p>
      </section>
      <details className="panel readouts" open><summary>Telemetry</summary>
        <div className="panel-title"><AudioLines size={16}/> Live telemetry <span className={'end live '+(s.running ? 'active' : '')} aria-label={s.running ? 'Running' : 'Paused'}/></div>
        <div className="panel-pad">
          <div className="metric"><span>Cabin CO₂</span><strong>{fmt(point.cabin)} <small>ppm</small></strong></div>
          <div className="metric local"><span>Breathing-zone CO₂</span><strong>{hidden ? 'Masked' : <>{fmt(point.local)} <small>ppm</small></>}</strong></div>
          <div className="metric compact"><span>Local − cabin</span><strong>{hidden ? '—' : fmt(point.local-point.cabin)} <small>ppm</small></strong></div>
          <div className="rail-chart"><TelemetryChart data={s.points} series={[{key:'cabin',label:'Cabin'},...(!hidden ? [{key:'local',label:'Breathing zone'}] : [])]} unit="ppm" cursor={point.t}/></div>
          <div className="divider"/>
          <div className="subheading">VIRTUAL SENSORS</div>
          {s.sensors.map(sensor=><div className="sensor-read" key={sensor.id}><span>{sensor.id} · {hidden ? 'Virtual' : zoneName(sensor)}</span><b>{fmt(reading(point,sensor,s.noise))} ppm</b></div>)}
          {!hidden && metrics.truth != null && metrics.alert == null && <div className="notice">Local crossing missed by sensors</div>}
          <section className="evidence-panel" aria-label="Recommended actions">
            <h3>Recommended actions</h3>
            <ul className="model-actions">
              {hidden ? <li><strong>Hold</strong> Reveal the modeled zone to assess detection.</li>
                : metrics.truth != null && metrics.alert == null ? <li><strong>Finding · demo</strong> The local crossing went undetected. Compare with a sensor in the breathing zone.</li>
                : metrics.truth != null ? <li><strong>Info</strong> Compare the first alert with the first local crossing to assess timing.</li>
                : <li><strong>Info</strong> Run a longer comparison or try reduced ventilation to investigate when local CO₂ crosses the selected reference.</li>}
            </ul>
          </section>
          <details className="model-details"><summary>Model assumptions &amp; evidence</summary><ModelEvidence settings={s.settings}/></details>
        </div>
      </details>
    </div>
    {!lab && <section ref={crew} id="crew-health-context" className="panel section crew-integrated" aria-label="Crew health in this simulation"><CrewHealthPanel/></section>}
    <Robustness/>
    <MeasurementCatalog points={s.points} sensors={s.sensors} noise={s.noise} masked={hidden} threshold={threshold}/>
    <details className="panel section">
      <summary>Run measurements</summary>
      <p><a href="#/crew-health">Explore Crew Health within Simulation ↗</a></p>
      <p>Modeled results for the full recorded run. Means are weighted by elapsed time. Minimum and maximum use the recorded samples.</p>
      <h3>Run and settings</h3>
      <div className="stats">
        <div>Duration <b>{runSummary.duration} s</b></div>
        <div>Recorded samples <b>{s.points.length.toLocaleString()}</b></div>
        <div>Ventilation setting <b>{fmt(100*s.settings.ventilation)}%</b></div>
        <div>CO₂ removal setting <b>{fmt(100*s.settings.scrubber)}%</b></div>
        <div>Crew activity <b>{s.settings.activity}×</b></div>
        <div>Sensor noise amplitude <b>{s.noise} ppm</b></div>
      </div>
      <h3>Cabin CO₂</h3>
      <div className="stats">
        <div>Minimum <b>{fmt(runSummary.cabinMin)} ppm</b></div>
        <div>Mean <b>{fmt(runSummary.cabinMean)} ppm</b></div>
        <div>Maximum <b>{fmt(runSummary.cabinMax)} ppm</b></div>
        <div>Change from start <b>{fmt(runSummary.cabinChange)} ppm</b></div>
      </div>
      {!hidden && <>
        <h3>Breathing-zone CO₂</h3>
        <div className="stats">
          <div>Minimum <b>{fmt(runSummary.localMin)} ppm</b></div>
          <div>Mean <b>{fmt(runSummary.localMean)} ppm</b></div>
          <div>Maximum <b>{fmt(peak)} ppm</b></div>
          <div>Change from start <b>{fmt(runSummary.localChange)} ppm</b></div>
          <div>Largest local − cabin gap <b>{fmt(runSummary.maxGap)} ppm</b></div>
        </div>
      </>}
    </details>
    <details className="panel section" open><summary>{lab ? "Sensor placement and detection" : "Detection events"}</summary>
      <div className="section-title"><h2>{lab ? 'Sensor placement' : 'Detection events'}</h2>{lab && <button onClick={()=>{if(!hidden) {s.select('Reduced ventilation'); set({sensors:[cabinSensor],thresholdId:'demo'})} hide(!hidden); setInstrument(hidden ? 'local' : 'cabin')}}>{hidden ? <Eye size={16}/> : <EyeOff size={16}/>} {hidden?'Reveal modeled zone':'Start masked exercise'}</button>}</div>
      <p>The {rule.windowSeconds ? "one-hour time-weighted average" : "first sample"} at or above {Math.round(threshold).toLocaleString()} ppm triggers a model alert. This is not a compliance assessment. Layout and noise changes are evaluated against the entire recorded run.</p>
      <div className="stats"><div>First sensor alert <b>{metrics.alert != null ? metrics.alert+' s' : 'None'}</b></div>{!hidden && <><div>Peak local CO₂ <b>{fmt(peak)} ppm</b></div><div>Raw concentration time above reference <b>{timeAbove.toFixed(1)} s</b></div><div>First local crossing <b>{metrics.truth != null ? metrics.truth+' s' : 'None'}</b></div><div>Mean absolute error <b>{fmt(metrics.meanError)} ppm</b></div><div>Alert minus crossing <b>{metrics.delay != null ? metrics.delay+' s' : metrics.truth != null ? 'Missed' : 'No local crossing'}</b></div></>}</div>
      {!hidden && <p>Duration uses linear interpolation between samples. Mean absolute error compares the highest sensor reading at each sample with modeled breathing-zone CO₂.</p>}
      {lab && <>
        <div className="actions"><button onClick={()=>set({sensors:[cabinSensor]})}>Cabin only</button><button disabled={hidden} onClick={()=>set({sensors:[cabinSensor,localSensor]})}>Cabin + breathing zone</button></div>
        <p>Drag markers on the schematic or adjust positions below. The zone boundary assigns each reading. Marker halos indicate location only.</p>
        {s.sensors.map(sensor=><div className="mapping" key={sensor.id}><b>{sensor.id}</b><label>Place sensor<select aria-label={sensor.id+' placement'} disabled={hidden} value={isLocal(sensor)?'local':'cabin'} onChange={e=>{const target=e.target.value==='local'?localSensor:cabinSensor;move(sensor.id,target.x,target.y)}}><option value="cabin">Cabin</option><option value="local">Breathing zone</option></select></label><label>X position <input disabled={hidden} type="range" min={8} max={92} value={sensor.x*100} onChange={e=>move(sensor.id,+e.target.value/100,sensor.y)}/></label><label>Y position <input disabled={hidden} type="range" min={12} max={88} value={sensor.y*100} onChange={e=>move(sensor.id,sensor.x,+e.target.value/100)}/></label></div>)}
        <label className="range-label">Deterministic noise amplitude · {s.noise} ppm<input type="range" min="0" max="500" step="10" value={s.noise} onChange={e=>set({noise:+e.target.value})}/></label>
        {candidates.length > 0 && <><h3>Candidate layouts ranked by mean error</h3><div className="stats">{candidates.map(layout=><div key={layout.name}>{layout.name}<b>{fmt(layout.error)} ppm mean error</b></div>)}</div></>}
      </>}
    </details>
  </>
}
