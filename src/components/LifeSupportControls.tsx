import { useMemo } from 'react'
import { useSim } from '../stores/simulationStore'
import { run } from '../simulation/engine'
import { supportTimeline } from '../simulation/lifeSupport'
import { TelemetryChart } from './TelemetryChart'
export function LifeSupportControls({busy=false,inspecting=false}:{busy?:boolean;inspecting?:boolean}) {
  const s=useSim(),latest=s.points.at(-1)!
  const plan=useMemo(()=>({initialSettings:s.initialSettings,initialSupport:s.initialSupport,interventions:s.interventions,support:s.support}),[s.initialSettings,s.initialSupport,s.interventions,s.support])
  const oxygen=useMemo(()=>supportTimeline(s.points,plan),[s.points,plan])
  const unchanged=useMemo(()=>run(s.initialSettings,latest.t).at(-1)!,[s.initialSettings,latest.t])
  const disabled=busy||inspecting||latest.t>=3600||s.interventions.length>=100
  const last=s.interventions.at(-1)
  const delta=latest.local-unchanged.local
  return <section className="life-support-console" aria-label="Life support interventions">
    <div className="console-heading"><div><h2>Life support</h2><p>Apply a change at {latest.t} s, then watch the next minute. Past samples stay intact.</p></div><button className="primary" disabled={busy||inspecting||latest.t>=3600} onClick={()=>s.advance(60)}>Advance 60 s</button></div>
    {inspecting&&<p role="status">Return to the latest sample to apply an intervention.</p>}
    <div className="support-actions">
      <article><h3>Mix cabin air</h3><p>Exchange between the two modeled volumes.</p><strong>{Math.round(s.settings.ventilation*100)}%</strong><button disabled={disabled} onClick={()=>s.intervene('Increase mixing to 90%',{ventilation:.9})}>Increase mixing</button></article>
      <article><h3>Remove CO₂</h3><p>Increase the modeled cabin removal term.</p><strong>{Math.round(s.settings.scrubber*100)}%</strong><button disabled={disabled} onClick={()=>s.intervene('Increase CO₂ removal to 90%',{scrubber:.9})}>Increase removal</button></article>
      <article><h3>Crew activity</h3><p>Changes the illustrative metabolic source.</p><strong>{s.settings.activity.toFixed(1)}×</strong><div><button disabled={disabled} onClick={()=>s.intervene('Rest · activity 0.6×',{activity:.6})}>Rest</button><button disabled={disabled} onClick={()=>s.intervene('Exercise · activity 2.5×',{activity:2.5})}>Exercise</button></div></article>
      <article><h3>O₂ support target</h3><p>Regulator target; pp = percentage points.</p><strong>{s.support.oxygenTarget.toFixed(1)}%</strong><div><button aria-label="Lower oxygen target" disabled={disabled||s.support.oxygenTarget<=18} onClick={()=>s.intervene('Lower O₂ target',{}, {oxygenTarget:Math.max(18,Math.round((s.support.oxygenTarget-.5)*10)/10)})}>− 0.5 pp</button><button aria-label="Increase oxygen target" disabled={disabled||s.support.oxygenTarget>=23} onClick={()=>s.intervene('Increase O₂ target',{}, {oxygenTarget:Math.min(23,Math.round((s.support.oxygenTarget+.5)*10)/10)})}>+ 0.5 pp</button></div></article>
    </div>
    <div className="support-result" aria-live="polite"><span>Modeled cabin O₂ <b>{oxygen.at(-1)!.oxygen.toFixed(3)}%</b></span><span>Local CO₂ vs. no intervention <b>{delta>0?'+':''}{Math.round(delta).toLocaleString()} ppm</b></span><span>Changes recorded <b>{s.interventions.length}</b></span></div>
    <p className="scene-help">O₂ is an independent educational channel. Increasing its target does not remove CO₂ or prove a crew member has recovered. The comparison reruns the original settings with no interventions.</p>
    {last&&<p className="intervention-confirmation" role="status">Applied at {last.t} s: {last.label}. {latest.t===last.t?'Advance time to see the modeled response.':'The graphs include the response since this change.'}</p>}
    <details className="support-history"><summary>O₂ trend and intervention log</summary>
      <TelemetryChart data={oxygen} series={[{key:'oxygen',label:'Modeled cabin O₂'},{key:'oxygenTarget',label:'Regulator target'}]} unit="%"/>
      {s.interventions.length?<ol>{s.interventions.map((event,index)=><li key={index}><time>{event.t} s</time><span>{event.label}</span></li>)}</ol>:<p>No interventions yet.</p>}
      <p>Reset or Run 300 s starts a fresh experiment with the current settings. Save experiment preserves this log for replay and report export. The one-hour run limit and 100-change limit keep the exercise bounded.</p>
    </details>
    <details><summary>O₂ assumptions and source</summary><p>O₂ starts at 20.9%. A first-order regulator approaches the selected target with a chosen 120 s time constant; uptake is derived from the existing illustrative CO₂ source using RQ = 0.92 and a 31 m³ effective volume. The software exploration range of 18–23% is not a recommended operating range. No pressure, blood oxygen, tissue delivery, or clinical response is predicted.</p><p><a href="https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/" target="_blank" rel="noreferrer">NASA CO₂ brief: RQ background</a> · <a href="https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/" target="_blank" rel="noreferrer">NASA life-support functions</a></p></details>
  </section>
}
