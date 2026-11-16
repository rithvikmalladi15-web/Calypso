import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { sources } from '../data/sourceRegistry'
import { limitations } from '../stores/experimentStore'
export function ResearchPage() {
  const [query,setQuery]=useState('')
  const matches=sources.filter(s=>Object.values(s).join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <div className="page-heading"><h1>Research &amp; Methods</h1><p>See which NASA sources informed CALYPSO and how the simulator models cabin air.</p></div>
    <section className="panel section"><h2>Cabin Simulation and Sensor Lab · Two compartments</h2><p>{limitations}</p>
      <div className="equation">Vᵦ dCᵦ/dt = S − Q(Cᵦ − C𝚌)<br/>V𝚌 dC𝚌/dt = Q(Cᵦ − C𝚌) − R C𝚌</div>
      <p>Concentrations are in ppm and time is in seconds. Effective volumes Vᵦ and V𝚌 are 1 and 30 m³. Exchange Q = 0.006 + 0.074 × ventilation and removal R = 0.15 × scrubber are in m³/s. Source S = 22 × relative activity is in ppm·m³/s. Both zones start at 650 ppm. Forward Euler integrates the balances in increments of at most one second.</p>
      <p>Conceptual schematic, not a spatial simulation. Moving a marker selects one of two well-mixed volumes; position within a volume has no effect. The cartoon suit is an illustration, not a modeled suit atmosphere.</p>
      <h3>Parameters and provenance</h3>
      <div className="parameter-table"><table><thead><tr><th>Quantity</th><th>Value / formula</th><th>Units</th><th>Source or assumption</th></tr></thead><tbody>
      {[
        ['Breathing-zone volume Vᵦ','1','m³','Illustrative effective volume; not an anatomical measurement'],
        ['Cabin volume V𝚌','30','m³','Illustrative effective volume; not ISS volume'],
        ['Exchange Q','0.006 + 0.074v','m³/s','Author-selected coefficient; v ∈ [0,1] is a relative control'],
        ['Removal R','0.15r','m³/s','Author-selected first-order clearance; r ∈ [0,1]'],
        ['Source S','22a','ppm·m³/s','Illustrative source; a ∈ [0,3], not a measured metabolic rate'],
        ['Initial Cᵦ and C𝚌','650','ppm','Chosen starting condition; not fitted to RR-1'],
        ['Integrator Δt','≤1','s','Explicit Euler; exchange uses old-state values in both balances'],
        ['Sensor noise','A sin(2.37t + phase)','ppm','Deterministic synthetic noise; A = 0–500 ppm, phase from sensor ID; reading clipped at zero'],
        ['Demo threshold','1,250','ppm','Educational rule, instantaneous first recorded crossing'],
        ['NASA cabin reference','3; one-hour average','mmHg','NASA-STD-3001 Vol. 2 §6.2.1.3 [V2 6004]; linked below'],
        ['Assumed total pressure','760','mmHg','Conversion assumption: ppm = ppCO₂ / total pressure × 10⁶; no pressure dynamics'],
      ].map(row=><tr key={row[0]}>{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}
      </tbody></table></div>
      <p><a href="https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/" target="_blank" rel="noreferrer">NASA cabin CO₂ requirement and rationale</a>. The source motivates ventilation and removal as distinct mechanisms; it does not supply our coefficients. The NASA reference requires a complete 3,600-second time-weighted window, integrated by trapezoids. Threshold crossing times are recorded sample times; duration above a raw reference uses interpolation.</p>
      <h3>Mass balance and reproducibility</h3>
      <p>Adding the balances gives d(VᵦCᵦ + V𝚌C𝚌)/dt = S − RC𝚌. With S = R = 0, exchange conserves volume-weighted concentration. For positive Q and R, steady state is C𝚌 = S/R and Cᵦ = S/R + S/Q. The reduced-ventilation demo uses v = 0.12, r = 0.65, a = 1, no noise, a 300-second run and the demo rule. Its 36-second local crossing is a reproducible result of these assumptions.</p>
      <h3>Limitations</h3><ul>
        <li>No spatial airflow, CFD, geometry-resolved plume, breathing cycle, or suit/helmet atmosphere.</li>
        <li>No physiological, medical, or mission safety prediction. The demo rule is not an exposure limit.</li>
        <li>Volumes and coefficients are illustrative and not calibrated to RR-1. Settings are constant between recorded interventions.</li>
        <li>Instantaneous ideal sensors with optional deterministic noise; no response lag, drift, or real instrument uncertainty.</li>
        <li>Two uniform volumes and a discrete location boundary; no intermediate concentrations or distance-dependent sensitivity.</li>
        <li>NASA reference conversion assumes constant 760 mmHg pressure. A reference crossing is not a compliance assessment.</li>
        <li>RR-1 has no paired human breathing-zone trace here; range overlap cannot validate detection timing.</li>
        <li>Robustness covers only the displayed discrete grid and fixed removal, duration, initial conditions, and noise.</li>
        <li>TODO: obtain matched experimental data and mission-specific off-nominal requirements before broader claims.</li>
      </ul>
    </section>
    <section className="panel section"><h2>Live interventions and illustrative oxygen channel</h2>
      <p>Mixing, removal and activity changes are applied after the recorded sample, without changing earlier points. Saved runs retain initial settings and a timestamped intervention plan for deterministic replay. The no-intervention comparison reruns the original settings for the same elapsed time; it is a model counterfactual, not measured treatment effectiveness.</p>
      <div className="equation">dF/dt = (Ftarget − F)/120 − (22a)/(0.92 × 31 × 10⁴)</div>
      <p>F is modeled cabin oxygen in percent; time is seconds. F starts at an assumed 20.9%. The chosen regulator response time is 120 s, the effective volume is 31 m³, and source activity a uses the existing illustrative CO₂ source. The 10⁴ factor converts ppm to percentage points. A constant-target interval uses the exact exponential solution. RQ = 0.92 is drawn from the assumptions in NASA’s CO₂ technical brief; NASA does not supply or validate this regulator equation.</p>
      <p>This independent educational O₂ channel is not a complete gas/pressure balance and does not alter the CO₂ equations. Changing O₂ does not remove CO₂. The 18–23% target range is a software exploration range, not an operating recommendation. No SpO₂, tissue oxygenation, breathing-rate prediction, organ injury or recovery score is calculated. The body’s amber cue represents a local air-reference crossing only.</p>
      <a href="https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/" target="_blank" rel="noreferrer">NASA CO₂ brief · respiratory quotient background</a>
    </section>
    <section className="panel section"><div className="section-title"><h2>Evidence library</h2><input aria-label="Search NASA evidence" placeholder="Search NASA evidence" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      {matches.length ? matches.map(s=><article className="source" key={s.id}><span className="micro">{s.section}</span><h3>{s.title}</h3><p>{s.detail}</p><a href={s.url} target="_blank" rel="noreferrer">Open NASA source <ExternalLink size={14}/></a></article>) : <p>No evidence matches this search.</p>}
    </section>
  </>
}
