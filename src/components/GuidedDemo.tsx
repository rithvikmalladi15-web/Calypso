import { useEffect, useState } from 'react'
import { initial, version } from '../simulation/engine'
import { cabinSensor, reading, threshold } from '../simulation/sensorModel'
import { limitations, snapshot, useExperiments } from '../stores/experimentStore'
import { CabinDiagram } from './CabinDiagram'
import { TelemetryChart } from './TelemetryChart'

import { guidedScenario as scenario, guidedSettings as settings, guidedLocalSensor as relocated, guidedPoints, guidedCabinResult as baseline, guidedLocalResult as comparison } from '../simulation/guidedScenario'

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
  function reset() {
    setStage(1)
    setSaved(false)
    setCursor(null)
    setPoints(guidedPoints)
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
      <h3>Step {stage} of 3 · {stage===1?'Read the cabin sensor':stage===2?'Reveal the breathing zone':'Compare the two placements'}</h3>
      <p>{stage===1?'S1 samples mixed cabin air. The local reading is hidden until you reveal it.':stage===2?'Compare the cabin and local lines. The breathing zone is the air near the astronaut’s face. Move S1 to see whether it detects the crossing.':'Only the location of S1 changed. Compare the alert times and average errors on the same run.'}</p>
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
    <details className="demo-guide">
      <summary>Complete workbench guide</summary>
      <ol>
        <li><strong>Set up a scenario.</strong> Choose a preset or select Custom. Ventilation controls mixing between cabin air and the breathing zone. CO₂ removal controls how strongly the model removes CO₂ from the cabin. Activity changes the rate at which the astronaut adds CO₂. These sliders are model settings.</li>
        <li><strong>Run and inspect.</strong> Run 300 s computes five minutes of modeled time. Run simulation plays the clock. Pause to inspect a sample, Step 1 s to advance, or Reset to return to the start. Playback speed changes how fast the clock moves on screen.</li>
        <li><strong>Read the cabin view and graphs.</strong> Switch between the cabin sensor and modeled breathing zone. The graph shows elapsed seconds across the bottom and CO₂ concentration in parts per million (ppm) on the vertical axis. This guided demo uses the 1,250 ppm experiment rule. In the main workbench, the Threshold reference selector also offers the NASA one-hour average reference, which requires a complete 3,600-second run. Use the sample slider to inspect a moment or compare with the baseline preset.</li>
        <li><strong>Test sensor placement.</strong> In <a href="#/sensor-lab">Sensor Lab</a>, start the masked exercise, run it, then reveal the local values. Drag a sensor or use the position controls. Compare the first local crossing with the first sensor alert to see whether the layout missed the event or detected it late.</li>
        <li><strong>Compare and export results.</strong> Run measurements summarizes the run. The measurement catalog shows 100 statistics across ten model signals. Save an experiment to reopen it in Experiments or use Reports and the export buttons to share results.</li>
        <li><strong>Explore evidence and crew context.</strong> <a href="#/nasa-data">NASA Data</a> shows measured flight and ground readings. <a href="#/research">Research</a> explains the sources. <a href="#/crew-health">Crew Health</a> covers spaceflight effects on the body.</li>
        <li><strong>Check robustness.</strong> Expand Robustness below the workbench and run the 36-setting sweep. Compare both heatmaps, distinguish Never from no crossing, and export the grid CSV.</li>
        <li><strong>Ask Roger.</strong> Open the AI guide in the lower-right corner for an explanation of the latest main-workbench run. Press Escape to close Roger or exit the active tutorial.</li>
      </ol>
    </details>
  </section>
}
