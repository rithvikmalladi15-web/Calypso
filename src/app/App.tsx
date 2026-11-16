import { guidedCabinResult, guidedLocalResult, guidedPoints } from '../simulation/guidedScenario'
import { NutritionPage } from '../pages/NutritionPage'
import { CrewHealthPage } from '../pages/CrewHealthPage'
import { Roger } from '../components/Roger'
import { AboutPage } from '../pages/AboutPage'
import { WorkspaceClock } from '../components/WorkspaceClock'
import { SimulationBoundary } from '../components/SimulationBoundary'
import { WorkspaceSettings } from '../components/WorkspaceSettings'
import { CabinDiagram } from '../components/CabinDiagram'
import { cabinSensor } from '../simulation/sensorModel'
import { initial } from '../simulation/engine'
import { GuidedDemo } from '../components/GuidedDemo'
import { useEffect } from 'react'
import { Orbit } from 'lucide-react'
import { Workbench } from '../components/Workbench'
import { NASADataPage } from '../pages/NASADataPage'
import { ResearchPage } from '../pages/ResearchPage'
import { ExperimentsPage } from '../pages/ExperimentsPage'
import { presets } from '../simulation/engine'
import { useSim } from '../stores/simulationStore'
import { routeHref, useRoute, type Route } from './router'

const navigation: {label: string; pages: Route[]}[] = [
  {label:'Workbench', pages:['Overview','Simulation','Sensor Lab','Crew Health','Crew Nutrition']},
  {label:'Data sources', pages:['NASA Data','Research','About']},
  {label:'Analytics', pages:['Experiments','Reports']},
]

function Overview() {
  const duration = guidedPoints.at(-1)!.t
  const alertTime = (time:number | undefined) => time===undefined ? 'No alert' : time+' s'
  return <>
    <section className="overview-hero" aria-labelledby="overview-title">
      <div className="overview-hero-copy">
        <h1 id="overview-title">A cabin sensor can miss CO₂ building up around an astronaut.</h1>
        <p>Run a short experiment to see what changes when you move one CO₂ sensor from the cabin to the astronaut’s breathing zone.</p>
        <div className="overview-hero-actions">
          <a className="button primary" href={routeHref('Simulation')}>Open the guided demo</a>
          <a className="button" href={routeHref('Research')}>See sources and methods</a>
        </div>
        <p className="overview-evidence">The Research page lists the NASA sources, what each was used for, and which assumptions belong to the simulation.</p>
      </div>
      <figure className="overview-hero-preview">
        <CabinDiagram point={initial} sensors={[cabinSensor]} ventilation={presets['Reduced ventilation'].ventilation} airflow heat={false} coverage={false} hidden playing={false}/>
        <figcaption>Starting layout · One sensor in the cabin</figcaption>
      </figure>
    </section>
    <section className="panel section overview-how" aria-labelledby="overview-result">
      <h2 id="overview-result">One run, two sensor placements</h2>
      <p>In the {duration}-second reduced-ventilation demo, the two sensors are evaluated against identical simulated air conditions.</p>
      <dl className="submission-results">
        <div><dt>Breathing zone crosses</dt><dd>{alertTime(guidedCabinResult.truth)}</dd></div>
        <div><dt>Cabin placement alerts</dt><dd>{alertTime(guidedCabinResult.alert)}</dd></div>
        <div><dt>Breathing-zone placement alerts</dt><dd>{alertTime(guidedLocalResult.alert)}</dd></div>
      </dl>
      <p>These times use the 1,250 ppm demonstration rule. The demo lets you reproduce the comparison and download its source samples.</p>
    </section>
    <section className="overview-paths" aria-label="Ways to explore CALYPSO">
      <article>
        <h2>Test a sensor layout</h2>
        <p>Compare the cabin and breathing-zone readings, then move a virtual sensor and see what changes.</p>
        <a href={routeHref('Sensor Lab')}>Open Sensor Lab <span aria-hidden="true">→</span></a>
      </article>
      <article>
        <h2>Explore NASA observations</h2>
        <p>Inspect CO₂, humidity, and temperature readings from the ISS and ground control.</p>
        <a href={routeHref('NASA Data')}>Open the data explorer <span aria-hidden="true">→</span></a>
      </article>
    </section>
    <details className="panel section purpose">
      <summary>Why we built CALYPSO</summary>
      <p>A cabin reading can hide a local change in air quality. We built CALYPSO so students and judges can investigate where a CO₂ sensor would detect that change and see the assumptions behind the result.</p>
      <ul><li>See why cabin and local CO₂ can differ.</li><li>Compare placement with the underlying run held fixed.</li><li>Use NASA RR-1 observations to inspect flight and ground measurements.</li></ul>
    </details>
    <section className="overview-paths" aria-label="Crew research tools">
      <article><h2>Crew Health</h2><p>Explore spaceflight research on the lungs, heart, eyes, bones, and other body systems.</p><a href={routeHref('Crew Health')}>Explore the body map →</a></article>
      <article><h2>Crew Nutrition</h2><p>Track meals by mission day and document the sources behind your nutrient totals.</p><a href={routeHref('Crew Nutrition')}>Open the nutrition log →</a></article>
    </section>
  </>
}
export function App() {
  const route=useRoute()
  const running=useSim(s=>s.running)
  const speed=useSim(s=>s.speed)
  useEffect(()=>{
    if(!running) return
    const timer=window.setInterval(()=>useSim.getState().tick(),100/speed)
    return ()=>window.clearInterval(timer)
  },[running,speed])
  useEffect(()=>{ window.scrollTo(0,0) },[route])
  return <>
    <a className="skip" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to content</a>
    <header className="topbar">
      <a href={routeHref('Overview')} className="brand" aria-label="Calypso overview"><span className="brand-icon"><Orbit size={21}/></span><span>CALYPSO</span></a>
      <span className="workspace-description">Spacecraft environmental research</span>
      <div className="workspace-status"><span className="model-status">Model ready</span><WorkspaceClock/></div>
      <WorkspaceSettings/>
    </header>
    <div className="shell">
      <aside className="sidebar">
        <nav aria-label="Workspace">
          {navigation.map(group => <div className="nav-group" role="group" aria-label={group.label} key={group.label}>
            <span className="nav-group-label">{group.label}</span>
            {group.pages.map(page => <a key={page} href={routeHref(page)} aria-current={page === route ? 'page' : undefined}>{page}</a>)}
          </div>)}
        </nav>
      </aside>
      <main id="main-content" data-page={routeHref(route).slice(2)} tabIndex={-1} key={route}>
        {route==='Overview' && <Overview/>}
        {(route==='Simulation'||route==='Sensor Lab') && <SimulationBoundary>{route==='Simulation' && <GuidedDemo/>}<Workbench lab={route==='Sensor Lab'}/></SimulationBoundary>}
        {route==='Crew Nutrition' && <NutritionPage/>}
        {route==='Crew Health' && <CrewHealthPage/>}
        {route==='NASA Data' && <NASADataPage/>}
        {route==='Research' && <ResearchPage/>}
        {route==='About' && <AboutPage/>}
        {(route==='Experiments'||route==='Reports') && <ExperimentsPage report={route==='Reports'}/>}
        <footer>CALYPSO · Educational research prototype · Modeled outputs are for classroom investigation. · AI-assisted design and development.</footer>
      </main>
    </div>
    <Roger/>
  </>
}
