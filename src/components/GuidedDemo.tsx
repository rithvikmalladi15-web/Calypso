import { useEffect, useState } from 'react'
import { initial, presets, run, version } from '../simulation/engine'
import { cabinSensor, localSensor, detect, reading, threshold } from '../simulation/sensorModel'
import { limitations, snapshot, useExperiments } from '../stores/experimentStore'
import { CabinDiagram } from './CabinDiagram'
import { TelemetryChart } from './TelemetryChart'

const scenario = 'Reduced ventilation'
const settings = presets[scenario]
const relocated = { ...localSensor, id: cabinSensor.id }
const ppm = (value: number) => Math.round(value).toLocaleString() + ' ppm'

export function GuidedDemo() {
  const [stage, setStage] = useState(0)
  const [saved, setSaved] = useState(false)
  const [points, setPoints] = useState([initial])
  const [cursor, setCursor] = useState<number | null>(null)
  const revealed = stage >= 2
  const moved = stage === 3
  const sensor = moved ? relocated : cabinSensor
  const peak = points.reduce((best, sample) => sample.local > best.local ? sample : best)
  const point = cursor === null ? (revealed ? peak : points[points.length - 1]) : points[cursor]
  const baseline = detect(points, [cabinSensor])
  const comparison = detect(points, [relocated])
  function reset() {
    setStage(1)
    setSaved(false)
    setCursor(null)
    setPoints(run(settings))
  }
  useEffect(() => {
    if (stage === 0) return
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      setStage(0)
      document.getElementById('simulation-heading')?.focus()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [stage])
  function exitTutorial() {
    setStage(0)
    document.getElementById('simulation-heading')?.focus()
  }
  function downloadComparison() {
    const record = {
      scenario, modelVersion: version, settings, durationSeconds: points[points.length - 1].t,
      demonstrationThresholdPpm: threshold, sensorNoisePpm: 0, limitations,
      baseline: { sensor: cabinSensor, firstAlertSeconds: baseline.alert ?? null, meanAbsoluteErrorPpm: baseline.meanError },
      relocated: { sensor: relocated, firstAlertSeconds: comparison.alert ?? null, meanAbsoluteErrorPpm: comparison.meanError },
      firstModeledCrossingSeconds: baseline.truth ?? null,
      samples: points.map(sample => ({
        elapsedSeconds: sample.t, cabinCo2Ppm: sample.cabin, localCo2Ppm: sample.local,
        cabinSensorPpm: reading(sample, cabinSensor), relocatedSensorPpm: reading(sample, relocated),
      })),
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'calypso-sensor-comparison.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function save() {
    const store = useExperiments.getState()
    store.save(snapshot(scenario + ' · Demo baseline', settings, [cabinSensor], points, 0))
    store.save(snapshot(scenario + ' · Demo relocated', settings, [relocated], points, 0))
    setSaved(true)
  }
  return <section className="panel section guided-demo">
    <div className="section-title">
      <h2>Can moving one sensor reveal a CO₂ buildup?</h2>
      {stage > 0 && <button onClick={exitTutorial} title="Escape">Exit tutorial</button>}
    </div>
    <p>An educational simulation of reduced ventilation. Compare one sensor in two locations using the same 300-second run.</p>
    {stage === 0 ? <button className="primary" onClick={reset}>Start 60-second demo</button> : <>
      <div className="viewer panel">
        <CabinDiagram point={point} sensors={[sensor]} airflow={false} heat coverage hidden={!revealed} playing={false} ventilation={settings.ventilation}/>
      </div>
      <div className="stats">
        <div>{sensor.id} reading <b>{ppm(reading(point, sensor))}</b></div>
        <div>Cabin CO₂ at {point.t} s <b>{ppm(point.cabin)}</b></div>
        {revealed && <><div>Modeled local CO₂ <b>{ppm(point.local)}</b></div><div>Local − cabin <b>{ppm(point.local-point.cabin)}</b></div><div>Peak local CO₂ at {peak.t} s <b>{ppm(peak.local)}</b></div></>}
      </div>
      <p>Cabin placement {baseline.alert == null ? 'did not trigger an alert' : 'alerted at '+baseline.alert+' s'} at the {ppm(threshold)} demonstration threshold.</p>
      {revealed && <p>First local crossing {baseline.truth == null ? 'did not occur' : 'occurred at '+baseline.truth+' s'}.</p>}
      {moved && <section className="demo-result" aria-labelledby="demo-result-title">
        <h3 id="demo-result-title">What changed when you moved S1?</h3>
        <p>Both placements use the same {points[points.length - 1].t}-second simulation with sensor noise off.</p>
        <table>
          <thead><tr><th scope="col">Sensor placement</th><th scope="col">First alert</th><th scope="col">Mean error</th></tr></thead>
          <tbody>
            <tr><th scope="row">Cabin</th><td>{baseline.alert == null ? 'No alert' : baseline.alert + ' s'}</td><td>{ppm(baseline.meanError)}</td></tr>
            <tr><th scope="row">Breathing zone</th><td>{comparison.alert == null ? 'No alert' : comparison.alert + ' s'}</td><td>{ppm(comparison.meanError)}</td></tr>
          </tbody>
        </table>
        <p>Mean error measures how far the sensor was from modeled breathing-zone CO₂, on average. <a href="#/research">See model assumptions and NASA sources</a>.</p>
        <div className="actions">
          {baseline.truth != null && <button onClick={()=>setCursor(points.findIndex(sample=>sample.t === baseline.truth))}>Inspect first crossing</button>}
          <button onClick={downloadComparison}>Download comparison data</button>
        </div>
      </section>}
      <div className="actions">
        {stage === 1 && <button className="primary" onClick={()=>setStage(2)}>Reveal modeled breathing zone</button>}
        {stage === 2 && <button className="primary" onClick={()=>setStage(3)}>Move S1 to the breathing zone</button>}
        {moved && <><button className="primary" onClick={save} disabled={saved}>{saved ? 'Comparison saved' : 'Save comparison runs'}</button>{saved && <a href="#/experiments">Open Experiments</a>}</>}
        <button onClick={reset}>Reset demo</button>
        <a href="#/sensor-lab">Explore Sensor Lab</a>
      </div>
      {revealed && <><label className="range-label">Inspect sample at {point.t} s<input type="range" min={0} max={points.length-1} value={cursor ?? points.indexOf(peak)} onChange={event=>setCursor(Number(event.target.value))}/></label>
        <TelemetryChart data={points} series={[{key:'cabin',label:'Cabin'},{key:'local',label:'Breathing zone'}]} unit="ppm" threshold={threshold} cursor={point.t} events={[{time:baseline.truth,label:'Local crossing'},{time:moved ? comparison.alert : baseline.alert,label:'Sensor alert'}]}/>
      </>}
    </>}
  </section>
}
