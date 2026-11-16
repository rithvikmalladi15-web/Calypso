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
  const [playing,setPlaying] = useState(!reducedMotion)
  const [loop,setLoop] = useState(true)
  const [speed,setSpeed] = useState(20)
  const [map,setMap] = useState(false)
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
    setPositions([wall]);setSpeed(20);setLoop(true);setPlaying(true)
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
      <h1>Can moving one sensor reveal a CO₂ buildup?</h1>
      <div className="actions"><button className="primary" onClick={startDemo}>Run demo</button><span role="status">{pending ? 'Solving' : playing ? 'Playing' : 'Paused'} · {time} s</span></div>
    </header>
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
        <p className="field-schematic-note">Schematic, not to scale · Drag a sensor or use its coordinate controls.</p>
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
    <div className="actions">
      <button onClick={()=>void share()}>Copy scenario link</button><button disabled={!ready} onClick={exportCsv}>Export CSV</button><button disabled={!ready} onClick={exportPng}>Export cabin PNG</button>
      {status && <span role="status">{status}</span>}
    </div>
    {shareLink && <label className="field">Scenario URL<input readOnly value={shareLink} onFocus={event=>event.target.select()}/></label>}
    <details className="panel section"><summary>Model &amp; evidence</summary>
      <p>{columns} × {rows} cells · 0.5 s solver step{ready && result ? ' · solved in '+result.milliseconds.toFixed(2)+' ms' : ''}.</p>
      <p>CO₂ is transported by modeled airflow and diffusion. A source adds CO₂ at the crew cell, and a sink removes CO₂ at the scrubber.</p>
      <p>The controls constrain inputs to the numerical test envelope. Flow and removal coefficients are illustrative. The {format(demoThresholdPpm)} ppm line is a demonstration trigger.</p>
      <a href="#/research">Read equations, assumptions, and NASA references</a>
    </details>
  </div>
}
