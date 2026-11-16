import { SimulationMusic } from '../components/SimulationMusic'
import { CabinDiagram } from '../components/CabinDiagram'
import { cabinSensor } from '../simulation/sensorModel'
import { initial } from '../simulation/engine'
import { GuidedDemo } from '../components/GuidedDemo'
import { useEffect, useState } from 'react'
import { Orbit } from 'lucide-react'
import { Workbench } from '../components/Workbench'
import { NASADataPage } from '../pages/NASADataPage'
import { ResearchPage } from '../pages/ResearchPage'
import { ExperimentsPage } from '../pages/ExperimentsPage'
import { loadDefault } from '../data/nasaDataLoader'
import { presets } from '../simulation/engine'
import { detect } from '../simulation/sensorModel'
import { useSim } from '../stores/simulationStore'
import { useData } from '../stores/dataStore'
import { routeHref, routes, useRoute } from './router'

function Overview() {
  const state=useSim()
  const imported=useData(s=>s.data)
  const [availability,setAvailability]=useState('Checking…')
  const last=state.points[state.points.length-1]
  const metrics=detect(state.points,state.sensors,state.noise)
  useEffect(()=>{
    const request=new AbortController()
    loadDefault(request.signal).then(d=>setAvailability(d?d.dataset.rows.length.toLocaleString()+' source rows':'Import available')).catch(()=>{if(!request.signal.aborted)setAvailability('See NASA Data for details')})
    return ()=>request.abort()
  },[])
  return <>
    <section className="overview-hero" aria-labelledby="overview-title">
      <div className="overview-hero-copy">
        <h1 id="overview-title">Can a cabin sensor miss a CO₂ buildup?</h1>
        <p>Run a short experiment to see how CO₂ can build up around an astronaut. Reveal the modeled breathing zone, then move the sensor and compare what it detects.</p>
        <div className="overview-hero-actions">
          <a className="button primary" href={routeHref('Simulation')}>Start the interactive tutorial</a>
          <a className="button" href={routeHref('Research')}>See sources and methods</a>
        </div>
        <p className="overview-evidence">The Research page lists the NASA sources, what each was used for, and which assumptions belong to the simulation.</p>
      </div>
      <figure className="overview-hero-preview">
        <CabinDiagram point={initial} sensors={[cabinSensor]} ventilation={presets['Reduced ventilation'].ventilation} airflow={false} heat={false} coverage={false} hidden playing={false}/>
        <figcaption>Starting layout · One sensor in the cabin</figcaption>
      </figure>
    </section>
    <section className="panel section purpose">
      <h2>Why we built CALYPSO</h2>
      <p>One reading can hide a local change in air quality. We built CALYPSO so students and judges can see why the location of a CO₂ sensor matters in a spacecraft cabin.</p>
      <ul>
        <li>Compare cabin and breathing-zone readings at the same moment.</li>
        <li>Move one virtual sensor to isolate the effect of placement.</li>
        <li>Review NASA observations alongside the model assumptions in <a href={routeHref('Research')}>Research</a>.</li>
      </ul>
    </section>
    <section className="panel section"><h2>{state.scenario}</h2><p>{state.running?'Running':'Paused'} · {last.t} s elapsed</p>
    <div className="stats"><div>Cabin CO₂ <b>{Math.round(last.cabin)} ppm</b></div><div>Breathing zone <b>{Math.round(last.local)} ppm</b></div><div>Virtual sensors <b>{state.sensors.length}</b></div><div>Local threshold crossing <b>{metrics.truth==null?'None':metrics.truth+' s'}</b></div><div>NASA telemetry <b>{imported ? imported.rows.length.toLocaleString()+' source rows' : availability}</b></div></div></section>
    <h2 className="quick-title">Quick-start scenarios</h2><div className="preset-grid">{Object.entries(presets).map(([name,settings])=><a className="panel section preset" href={routeHref('Simulation')} key={name} onClick={()=>state.select(name as keyof typeof presets)}><h3>{name}</h3><p>{Math.round(settings.ventilation*100)}% ventilation · {settings.activity}× activity</p></a>)}</div>
  </>
}
export function App() {
  const route=useRoute()
  const running=useSim(s=>s.running)
  useEffect(()=>{
    if(!running) return
    const timer=window.setInterval(()=>useSim.getState().tick(),100)
    return ()=>window.clearInterval(timer)
  },[running])
  useEffect(()=>{ window.scrollTo(0,0) },[route])
  return <>
    <a className="skip" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to content</a>
    <header className="topbar">
      <a href={routeHref('Overview')} className="brand" aria-label="Calypso overview"><span className="brand-icon"><Orbit size={21}/></span><span>CALYPSO</span></a>
      <span className="workspace-description">Spacecraft environmental research</span>
    </header>
    <div className="shell">
      <aside className="sidebar">
        <nav aria-label="Workspace">
          {routes.map(r => <a key={r} href={routeHref(r)} aria-current={r===route?'page':undefined}>{r}</a>)}
        </nav>
      </aside>
      <main id="main-content" tabIndex={-1} key={route}>
        {route==='Overview' && <Overview/>}
        {(route==='Simulation'||route==='Sensor Lab') && <>{route==='Simulation' && <><SimulationMusic/><GuidedDemo/></>}<Workbench lab={route==='Sensor Lab'}/></>}
        {route==='NASA Data' && <NASADataPage/>}
        {route==='Research' && <ResearchPage/>}
        {(route==='Experiments'||route==='Reports') && <ExperimentsPage report={route==='Reports'}/>}
        <footer>CALYPSO · Educational research prototype · Modeled outputs are for classroom investigation. · AI-assisted design and development.</footer>
      </main>
    </div>
  </>
}
