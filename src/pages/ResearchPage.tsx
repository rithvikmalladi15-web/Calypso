import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { sources } from '../data/sourceRegistry'
import { limitations } from '../stores/experimentStore'
export function ResearchPage() {
  const [query,setQuery]=useState('')
  const matches=sources.filter(s=>Object.values(s).join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <div className="page-heading"><h1>Research</h1><p>See which NASA sources informed CALYPSO and how the simulator models cabin air.</p></div>
    <section className="panel section"><h2>Spatial workbench model</h2>
      <div className="equation">∂C/∂t = −∇·(uC) + D∇²C + S − k max(C − Cfloor, 0)</div>
      <p>The 32 × 18 grid uses a 0.5-second finite-volume step. Recirculating airflow and diffusion transport CO₂ from the crew cell. The rightmost scrubber cells remove it. Geometry and coefficients are illustrative.</p>
      <p>Starting CO₂ is 2,641 ppm, the first value in the bundled RR-1 ISS series. The 3,100 ppm demonstration trigger ranks virtual sensor placements.</p>
      <p>NASA V2 6004 specifies a one-hour average habitable-volume partial pressure of 3 mmHg. The optional plot reference assumes 1 atm. A 120-second run cannot assess the one-hour criterion.</p>
    </section>
    <section className="panel section"><h2>Guided comparison model · Two compartments</h2><p>{limitations}</p>
      <div className="equation">Vᵦ dCᵦ/dt = S − Q(Cᵦ − C𝚌)<br/>V𝚌 dC𝚌/dt = Q(Cᵦ − C𝚌) − R C𝚌</div>
      <p>Concentrations are in ppm and time is in seconds. Effective volumes Vᵦ and V𝚌 are 1 and 30 m³. Exchange Q = 0.006 + 0.074 × ventilation and removal R = 0.15 × scrubber are in m³/s. Source S = 22 × relative activity is in ppm·m³/s. Both zones start at 650 ppm. Forward Euler integrates the balances in increments of at most one second.</p>
      <p>The plume marks the schematic breathing zone. Flow paths illustrate ventilation changes qualitatively. The 1,250 ppm demonstration threshold is an experiment rule. The output has no medical or operational interpretation.</p>
    </section>
    <section className="panel section"><div className="section-title"><h2>Evidence library</h2><input aria-label="Search NASA evidence" placeholder="Search NASA evidence" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      {matches.length ? matches.map(s=><article className="source" key={s.id}><span className="micro">{s.section}</span><h3>{s.title}</h3><p>{s.detail}</p><a href={s.url} target="_blank" rel="noreferrer">Open NASA source <ExternalLink size={14}/></a></article>) : <p>No evidence matches this search.</p>}
    </section>
  </>
}
