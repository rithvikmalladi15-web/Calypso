import { readFieldSensors, readScenario, scenarioUrl } from '../simulation/scenarioLink'
import { useEffect, useMemo, useRef, useState } from 'react'
import { presets, type Settings } from '../simulation/engine'
import { columns, rows, crew, wall, initialPpm, demoThresholdPpm, fieldDuration, valueAt, cellIndex, type Cell } from '../simulation/fieldModel'
import { useField } from '../simulation/useField'
import { usePreferences } from '../app/SettingsContext'
import { download } from '../lib/chartDownloads'
import { ConcentrationField } from './ConcentrationField'
import { TelemetryChart } from './TelemetryChart'

const limits = 'https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/#6.2.1.3'
const format = (value:number) => Math.round(value).toLocaleString()
const controls = [
  {key:'ventilation',name:'Ventilation',max:1,scale:100,unit:'%',hint:'Strength of the modeled recirculation flow.'},
  {key:'scrubber',name:'Scrubber',max:1,scale:100,unit:'%',hint:'Removal rate in the scrubber columns.'},
  {key:'activity',name:'Crew activity',max:3,scale:1,unit:'×',hint:'CO₂ source relative to baseline activity.'},
] as const

export function FieldWorkbench({compact=false}:{compact?:boolean}) {
  const preferences = usePreferences()
  const reducedMotion = preferences?.preferences.reducedMotion ?? false
  const setFieldStress = preferences?.setFieldStress
  const [settings,setSettings] = useState<Settings>(()=>!compact && readScenario(location.hash) || presets['Reduced ventilation'])
  const [positions,setPositions] = useState<Cell[]>(()=>!compact && readFieldSensors(location.hash,columns,rows) || [wall])
  const [time,setTime] = useState(0)
  const [playing,setPlaying] = useState(compact && !reducedMotion)
  const [loop,setLoop] = useState(false)
  const [speed,setSpeed] = useState(20)
  const [map,setMap] = useState(false)
  const [tour,setTour] = useState<number|null>(null)
  const [status,setStatus] = useState('')
  const [shareLink,setShareLink] = useState('')
  const [showNasa,setShowNasa] = useState(false)
  const [controlsOpen,setControlsOpen] = useState(()=>typeof matchMedia==='undefined' || !matchMedia('(max-width:600px)').matches)

  const canvas = useRef<HTMLCanvasElement>(null)
  const {result,pending} = useField(settings)
  const frame = result?.frames[time]
  const wallTime = result?.firstCrossing[cellIndex(wall)]
  const recommendedTime = result?.recommendation ? result.firstCrossing[cellIndex(result.recommendation)] : null
  useEffect(()=>{
    if (compact) return
    const restore = () => {
      const settings = readScenario(location.hash)
      if (settings) {
        setSettings(settings)
        setPositions(readFieldSensors(location.hash,columns,rows) ?? [wall])
        setTime(0);setPlaying(false);setMap(false)
      }
    }
    window.addEventListener('hashchange',restore)
    return ()=>window.removeEventListener('hashchange',restore)
  },[compact])
  const local = frame ? valueAt(frame,crew) : initialPpm
  const sensor = frame ? valueAt(frame,positions[0]) : initialPpm
  const error = local-sensor
  const stress = Math.max(0,Math.min(1,Math.round((local-initialPpm)/180)/10))
  useEffect(()=>{
    if (compact || !setFieldStress) return
    setFieldStress(stress)
    return ()=>setFieldStress(null)
  },[compact,setFieldStress,stress])
  const trace = useMemo(()=>result?.frames.map((sample,t)=>({
    t,local:valueAt(sample,crew),s1:valueAt(sample,positions[0]),
    ...(positions[1] ? {s2:valueAt(sample,positions[1])} : {}),
  })) ?? [],[result,positions])
  const upperPpm = useMemo(()=>{
    let peak = initialPpm+250
    for(const sample of result?.frames ?? []) for(const value of sample) peak=Math.max(peak,value)
    return Math.ceil(peak/250)*250
  },[result])
  useEffect(()=>{
    if (pending || !playing) return
    const advance = () => setTime(previous=>previous>=fieldDuration ? (loop ? 0 : fieldDuration) : previous+1)
    const id = window.setInterval(advance,1000/speed)
    return ()=>window.clearInterval(id)
  },[pending,playing,loop,speed])
  useEffect(()=>{if(time===fieldDuration && !loop)setPlaying(false)},[time,loop])
  useEffect(()=>{if(reducedMotion)setPlaying(false)},[reducedMotion])

  function move(index:number,cell:Cell) {
    setPositions(previous=>previous.map((position,i)=>i===index ? cell : position))
  }
  function apply(next:Settings) { setSettings(next); setTime(0); setPlaying(false); setMap(false) }
  function startDemo() {
    apply(presets['Reduced ventilation'])
    setPositions([wall]);setSpeed(20);setLoop(false);setPlaying(true)
  }
  async function share() {
    const url=new URL(scenarioUrl(settings))
    const query=new URLSearchParams(url.hash.split('?')[1])
    query.set('sensors',positions.map(({x,y})=>x+','+y).join(';'))
    url.hash='/simulation?'+query
    setShareLink(url.href)
    try { await navigator.clipboard.writeText(url.href);setStatus('Copied scenario link.') }
    catch {setStatus('Select the URL below to copy it.')}
  }
  function exportCsv() {
    const values = trace.map(sample=>[sample.t,sample.s1,sample.local,...(positions[1] ? [sample.s2] : [])].join(','))
    download(new Blob([['elapsed_s,sensor_1_ppm,breathing_zone_ppm'+(positions[1] ? ',sensor_2_ppm' : ''),...values].join('\n')],{type:'text/csv'}),'calypso-field-traces.csv')
  }
  function exportPng() {
    canvas.current?.toBlob(blob=>{
      if(blob)download(blob,'calypso-field.png')
      else setStatus('Could not export the cabin view.')
    })
  }
  useEffect(()=>{
    if(tour===null)return
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setTour(null)}
    window.addEventListener('keydown',escape)
    return ()=>window.removeEventListener('keydown',escape)
  },[tour])
  const tourSteps = [
    {title:'One cabin reading does not tell the whole story.',text:'CO₂ is added at the crew cell. This illustrative model lets you test whether a sensor elsewhere detects the same change.',action:'Run the experiment'},
    {title:'Compare the same moment in two places.',text:'At 120 seconds, compare S1 with the breathing zone. The dashed chart line is the local concentration. The 3,100 ppm threshold is an experiment rule, not a safety limit.',action:'Compare sensor placement'},
    {title:'Change the measurement, not the experiment.',text:'S1 is now at the earliest-detecting eligible cell. The airflow, source and clock are unchanged. Compare its first detection with the wall sensor in the result below.',action:'Finish walkthrough'},
  ]
  function advanceTour() {
    if(tour===0){apply(presets['Reduced ventilation']);setPositions([wall]);setTime(fieldDuration);setTour(1)}
    else if(tour===1 && result?.recommendation){move(0,result.recommendation);setMap(true);setTour(2)}
    else setTour(null)
  }
  const caption = local>=demoThresholdPpm && sensor<demoThresholdPpm
    ? 'The breathing zone has crossed the demo threshold. S1 has yet to register it at this sample.'
    : local>=demoThresholdPpm ? 'The breathing zone and S1 are both at or above the demo threshold.'
    : 'Follow the field around the crew marker as CO₂ is added and transported through the cabin.'
  const ready = !!frame && !pending
  const crewCrossing = result?.firstCrossing[cellIndex(crew)] ?? -1

  if(compact) return <figure className="overview-hero-preview">
    {frame ? <ConcentrationField frame={frame} positions={positions} recommendation={null} detection={null} canvas={canvas} upperPpm={upperPpm}/>
      : <p className="panel-pad" role="status">Preparing baseline field…</p>}
    <figcaption>Reduced-ventilation model{reducedMotion ? ' · static preview' : ' · looping preview'}</figcaption>
    {result && <dl className="instrument-strip"><div><dt>Crew first crossing</dt><dd>{crewCrossing < 0 ? 'No alert' : crewCrossing+' s'}</dd></div><div><dt>Wall sensor</dt><dd>{wallTime != null && wallTime >= 0 ? wallTime+' s' : 'No alert in '+fieldDuration+' s'}</dd></div><div><dt>Earliest eligible cell</dt><dd>{recommendedTime==null ? 'No alert' : recommendedTime+' s'}</dd></div></dl>}
  </figure>

  return <div className="field-workspace">
    <header className="field-header">
      <div><span className="workbench-kicker">Environmental observatory / Experiment 01</span><h1>See what a cabin sensor misses.</h1><p>Trace CO₂ around the crew. Test where a sensor makes a difference.</p></div>
      <div className="actions"><button onClick={()=>{setPlaying(false);setTour(0)}}>Guided walkthrough</button><button className="primary" onClick={startDemo}>Run 120 s</button><span role="status">{pending ? 'Solving' : playing ? 'Playing' : 'Paused'} · {time} s</span></div>
    </header>
    {tour!==null && <section className="field-tour" aria-label="Guided walkthrough">
      <div><span className="workbench-kicker">Step {tour+1} of 3</span><h2>{tourSteps[tour].title}</h2><p>{tourSteps[tour].text}</p></div>
      <div className="actions"><button className="primary" disabled={!ready} onClick={advanceTour}>{tourSteps[tour].action}</button><button onClick={()=>setTour(null)}>Exit tutorial</button></div>
    </section>}
    <div className="field-bench">
      <details className="panel controls" open={controlsOpen} onToggle={event=>setControlsOpen(event.currentTarget.open)}>
        <summary>Scenario controls</summary>
        <div className="panel-pad">
          <label className="field">Preset<select value={Object.keys(presets).find(key=>presets[key as keyof typeof presets]===settings) ?? 'Custom'}
            onChange={event=>{const preset=presets[event.target.value as keyof typeof presets];if(preset)apply(preset)}}>
            {Object.keys(presets).map(key=><option key={key}>{key}</option>)}<option disabled>Custom</option>
          </select></label>
          {controls.map(({key,name,max,scale,unit,hint})=><label key={key} className="range-label" title={hint}>
            <span>{name}<b>{Number((settings[key]*scale).toFixed(2))}{unit}</b></span>
            <input type="range" min={0} max={max} step={key==='activity'?.1:.01} value={settings[key]} onChange={event=>{
              const value=Number(event.target.value)
              if(Number.isFinite(value)&&value>=0&&value<=max)apply({...settings,[key]:value})
            }}/>
          </label>)}
          <button onClick={()=>apply(presets.Baseline)}>Reset parameters</button>
          <div className="placement-presets"><span>Place sensor S1</span><button onClick={()=>move(0,wall)}>Cabin wall</button><button disabled={!ready || !result?.recommendation} onClick={()=>{if(result?.recommendation)move(0,result.recommendation)}}>Near crew</button></div>
          <details className="field-positions"><summary>Sensor coordinates</summary>
            {positions.map((position,index)=><fieldset key={index}>
              <legend>Sensor {index+1}</legend>
              <label className="field">Column · {position.x+1}<input type="range" min={0} max={columns-1} value={position.x} onChange={event=>move(index,{...position,x:+event.target.value})}/></label>
              <label className="field">Row · {position.y+1}<input type="range" min={0} max={rows-1} value={position.y} onChange={event=>move(index,{...position,y:+event.target.value})}/></label>
            </fieldset>)}
          </details>
        </div>
      </details>
      <section className="panel field-view" aria-label="Cabin field">
        <div className="instrument-strip"><div>Sensor S1 <strong>{format(sensor)} ppm</strong></div><div>Breathing zone <strong>{format(local)} ppm</strong></div><div className={error>0?'field-undercount':''}>Local − sensor <strong>{format(error)} ppm ({(100*error/local).toFixed(1)}%)</strong></div></div>
        <div className="field-canvas-area" aria-busy={pending}>
          {frame ? <ConcentrationField frame={frame} positions={positions} recommendation={map && ready ? result?.recommendation ?? null : null}
            detection={map && ready ? result?.firstCrossing ?? null : null} canvas={canvas} onMove={move} upperPpm={upperPpm}/>
            : <div className="field-skeleton" role="status">Computing the starting field…</div>}
        </div>
        <div className="playbar">
          <button className="primary" disabled={pending} onClick={()=>{if(time===fieldDuration)setTime(0);setLoop(false);setPlaying(!playing)}}>{playing?'Pause':'Play'}</button>
          <button disabled={pending || time>=fieldDuration} onClick={()=>{setPlaying(false);setTime(time+1)}}>Step</button>
          <button onClick={()=>{setPlaying(false);setTime(0)}}>Reset</button>
          <select aria-label="Playback speed" value={speed} onChange={event=>setSpeed(+event.target.value)}>{[1,5,20].map(value=><option key={value} value={value}>{value}×</option>)}</select>
          <button onClick={()=>setPositions(positions.length===1?[positions[0],{x:22,y:9}]:[positions[0]])}>{positions.length===1?'Add S2':'Remove S2'}</button>
        </div>
        <p className="simulation-caption">{pending ? 'Updating the model for the selected inputs.' : caption}</p>
        <p className="field-schematic-note">AI-assisted schematic · Not to scale. Drag a sensor or use its placement controls.</p>
      </section>
      <section className="panel field-telemetry" aria-label="Live telemetry">
        <div className="panel-title">Telemetry</div>
        <div className="panel-pad">
          <label className="field">Sample · {time} s<input aria-label="Sample time" type="range" min={0} max={fieldDuration} value={time} disabled={!ready} onChange={event=>{setPlaying(false);setTime(+event.target.value)}}/></label>
          {trace.length ? <TelemetryChart data={trace} series={[{key:'s1',label:'Sensor S1'},{key:'local',label:'Breathing zone'},...(positions[1]?[{key:'s2',label:'Sensor S2'}]:[])]} unit="ppm" cursor={time} threshold={demoThresholdPpm} reference={showNasa ? {value:3/760*1e6,label:"NASA 1 h equivalent at 1 atm"} : undefined}/>
            : <div className="field-skeleton" role="status">Preparing telemetry…</div>}
          <label className="check"><input type="checkbox" checked={showNasa} onChange={event=>setShowNasa(event.target.checked)}/> Show NASA reference</label>
          <p><a href={limits} target="_blank" rel="noreferrer" title="NASA-STD-3001 V2 6004 applies to average one-hour habitable-volume partial pressure.">NASA V2 6004 · 3 mmHg one-hour average</a>{showNasa && " · 3,947 ppm at 1 atm, for context. The 120 s model cannot assess a one-hour average."}</p>
          <p>Starting value: {format(initialPpm)} ppm · <a href="#/nasa-data">RR-1 ISS first CO₂ sample</a></p>
          <button disabled={!ready} aria-pressed={map} onClick={()=>setMap(!map)}>{map?'Show concentration':'Best sensor placement'}</button>
          {map && ready && <p>{result?.recommendation ? 'The recommended cell first reached the demo threshold at '+recommendedTime+' s, the earliest among eligible cells.' : 'No eligible cell reached the demo threshold in this run.'}</p>}
          {map && ready && result?.recommendation && <button onClick={()=>{if(result.recommendation)move(0,result.recommendation)}}>Move sensor here</button>}
        </div>
      </section>
    </div>
    {ready && result && <section className="experiment-result" aria-label="Experiment result">
      <div className="result-intro"><span className="workbench-kicker">Full-run result · {fieldDuration} s</span><h2>{crewCrossing<0 ? 'No local crossing in this run.' : wallTime!=null && wallTime<0 ? 'The wall sensor misses the local crossing.' : 'Placement changes when the signal arrives.'}</h2><p>Same model, different measurement locations. First crossing of the {format(demoThresholdPpm)} ppm experiment rule.</p></div>
      <dl className="result-readings">{[{label:'Breathing zone',value:crewCrossing},{label:'Cabin wall',value:wallTime},{label:'Sensor S1',value:result.firstCrossing[cellIndex(positions[0])]}].map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value==null || item.value<0 ? 'Not detected' : item.value+' s'}</dd></div>)}</dl>
      <p className="result-boundary">Illustrative transport model, not a prediction of ISS conditions. NASA RR-1 supplies the starting concentration; it does not validate the spatial field. <a href="#/research">Check the sources →</a></p>
    </section>}
    <div className="actions export-actions">
      <button onClick={()=>void share()}>Copy scenario link</button><button disabled={!ready} onClick={exportCsv}>Export CSV</button><button disabled={!ready} onClick={exportPng}>Export cabin PNG</button>
      {status && <span role="status">{status}</span>}
    </div>
    {shareLink && <label className="field">Scenario URL<input readOnly value={shareLink} onFocus={event=>event.target.select()}/></label>}
    <details className="panel section"><summary>Model &amp; evidence</summary>
      <p>{columns} × {rows} cells · 0.5 s solver step{ready && result ? ' · solved in '+result.milliseconds.toFixed(2)+' ms' : ''}.</p>
      <p>CO₂ is transported by modeled airflow and diffusion. A source adds CO₂ at the crew cell, and a sink removes CO₂ at the scrubber.</p>
      <p>The controls constrain inputs to the numerical test envelope. Flow and removal coefficients are illustrative. The {format(demoThresholdPpm)} ppm line is a demonstration trigger.</p>
      <a href="#/research">Review NASA sources</a>
    </details>
  </div>
}
