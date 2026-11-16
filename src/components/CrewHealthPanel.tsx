import { useState } from 'react'
import { useSim } from '../stores/simulationStore'
import { thresholds } from '../simulation/thresholds'

const humanHealth = 'https://www.nasa.gov/reference/fundamentals-of-human-health/'
const gravity = 'https://www.nasa.gov/hrp/hazard-gravity-fields/'
const systems = [
  {name:'Brain & balance', x:150,y:57, side:-1, labelY:36, phase:'Early adaptation', detail:'Gravity transitions can disturb balance, orientation and coordination. Some crew experience space motion sickness.', measures:'Balance, spatial orientation, coordination', url:gravity},
  {name:'Eyes', x:164,y:75,side:1,labelY:52, phase:'Extended flight', detail:'Fluid shifts toward the head can affect eye structure and vision. NASA studies these changes during spaceflight.', measures:'Vision tests, retinal imaging, ocular ultrasound',url:'https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision/'},
  {name:'Lungs',x:127,y:145,side:-1,labelY:131,phase:'Cabin environment',detail:'The breathing-zone reading estimates CO₂ in the air near the astronaut’s face. To assess how the body responds, researchers need separate physiological measurements.',measures:'Breathing rate, lung function, exhaled CO₂',url:'https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/'},
  {name:'Heart & circulation',x:157,y:154,side:1,labelY:130,phase:'Early adaptation',detail:'With less gravitational pull on the body in orbit, fluids redistribute toward the chest and head. Researchers track changes in heart and blood vessel function.',measures:'Blood pressure, heart rate, vascular ultrasound',url:'https://www.nasa.gov/humans-in-space/cardiovascular-health-in-microgravity/'},
  {name:'Kidneys',x:166,y:195,side:1,labelY:207,phase:'Extended flight',detail:'Spaceflight can change hydration and urine composition. These changes, along with increased calcium excretion, can contribute to kidney stone risk.',measures:'Urine volume, urinary calcium, urine chemistry',url:humanHealth},
  {name:'Muscles',x:124,y:275,side:-1,labelY:264,phase:'Extended flight',detail:'In microgravity, muscles that normally support posture work less. NASA studies strength and uses resistance exercise to help maintain it.',measures:'Muscle size, strength, exercise performance',url:'https://www.nasa.gov/humans-in-space/counteracting-bone-and-muscle-loss-in-microgravity/'},
  {name:'Bones',x:173,y:320,side:1,labelY:333,phase:'Extended flight',detail:'Reduced loading affects bones that bear weight on Earth, including the hips and spine. Researchers track bone density and recovery after flight.',measures:'Bone density, bone structure, recovery after flight',url:'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/'},
] as const

const phases = [
  ['First days','Balance, orientation and headward fluid shifts are part of early adaptation.'],
  ['Weeks to months','Researchers track how reduced loading affects muscle and bone and how the eyes and circulation adapt.'],
  ['After landing','The crew readapts to gravity. Researchers can monitor balance, strength and recovery over time.'],
]

export function CrewHealthPanel() {
  const [selected,setSelected] = useState(2)
  const [phase,setPhase] = useState(0)
  const system = systems[selected]
  const sample = useSim(s=>s.points.at(-1))
  const masked = useSim(s=>s.masked)
  const thresholdId = useSim(s=>s.thresholdId)
  const rule = thresholds[thresholdId]
  const ppm = (value:number) => Math.round(value).toLocaleString()+' ppm'
  return <>
    <header className="page-heading crew-heading">
      <h2>Crew Health</h2>
      <p>Explore the body alongside your current cabin run. NASA research context is shown here; the model calculates air concentrations, not organ function or health outcomes.</p>
    </header>
    <div className="crew-workbench">
      <section className="crew-view" aria-label="Interactive crew anatomy">
        <div className="crew-view-title">Crew anatomy <span>Illustrative body map</span></div>
        <svg viewBox="0 0 300 420" role="img" aria-label="Human body schematic with selectable research regions">
          <defs>
            <pattern id="crew-grid" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M15 0H0V15" fill="none" stroke="#224451" strokeWidth=".5"/></pattern>
            <radialGradient id="crew-light"><stop stopColor="#184046"/><stop offset="1" stopColor="#07151e"/></radialGradient>
          </defs>
          <rect width="300" height="420" fill="url(#crew-light)"/>
          <rect width="300" height="420" fill="url(#crew-grid)"/>
          <ellipse cx="150" cy="395" rx="70" ry="15" fill="none" stroke="#477787"/>
          <path d="M150 38C119 38 121 84 135 96L133 107C115 109 101 117 97 139L85 181 71 219Q66 233 76 236Q86 238 91 226L109 187 117 157 120 185 111 225 117 277 121 321 118 371 108 387Q105 397 124 395L138 390 145 327 148 276 150 251 152 276 155 327 162 390 176 395Q195 397 192 387L182 371 179 321 183 277 189 225 180 185 183 157 191 187 209 226Q214 238 224 236Q234 233 229 219L215 181 203 139C199 117 185 109 167 107L165 96C179 84 181 38 150 38Z" fill="#153744" stroke="#78b5be" strokeWidth="1.4"/>
          <g fill="none" stroke="#468390" opacity=".55">
            <path d="M150 100V232M116 129Q150 103 184 129M120 142Q150 118 180 142M121 155Q150 133 179 155M123 168Q150 150 177 168M117 209Q150 240 183 209M130 247L132 315 128 375M170 247L168 315 172 375M104 140L95 176 80 220M196 140L205 176 220 220"/>
          </g>
          <g stroke="#87c4cc" strokeWidth="1.15" fill="#397584" opacity=".9">
            <path d="M136 55Q139 46 149 48Q160 45 166 55Q170 65 161 67H138Q131 63 136 55Z"/>
            <path d="M141 129Q130 119 123 137Q117 151 123 167Q132 173 141 164ZM159 129Q170 119 177 137Q183 151 177 167Q168 173 159 164Z"/>
            <path d="M155 149Q145 136 140 147Q137 159 155 173Q172 159 169 148Q165 138 155 149Z" fill="#987083"/>
            <path d="M132 183Q119 182 122 198Q125 207 134 199Q140 194 132 183ZM168 183Q181 182 178 198Q175 207 166 199Q160 194 168 183Z"/>
            <circle cx="141" cy="75" r="3"/><circle cx="159" cy="75" r="3"/>
          </g>
          {systems.map((item,index)=><g key={item.name} className={index===selected?'crew-marker active':'crew-marker'} onClick={()=>setSelected(index)} aria-hidden="true">
            <path d={`M${item.x} ${item.y} L${item.side===1?217:83} ${item.labelY} H${item.side===1?272:28}`} fill="none"/>
            <circle cx={item.x} cy={item.y} r="13" fill="transparent" stroke="none"/>
            <circle cx={item.x} cy={item.y} r="4"/>
            <text x={item.side===1?290:10} y={item.labelY-6} textAnchor={item.side===1?'end':'start'}>{item.name}</text>
          </g>)}
        </svg>
        <span className="ai-image-credit">Made by AI · Illustrative body map</span>
        <div className="crew-system-buttons" role="group" aria-label="Body systems">
          {systems.map((item,index)=><button key={item.name} aria-pressed={selected===index} onClick={()=>setSelected(index)}>{item.name}</button>)}
        </div>
      </section>
      <div className="crew-details">
        <section className="panel section">
          <p className="crew-kicker">Spaceflight research · {system.phase}</p>
          <h2>{system.name}</h2>
          <p>{system.detail}</p>
          <h3>Measurements researchers can use</h3>
          <p>{system.measures}</p>
          <a href={system.url} target="_blank" rel="noreferrer">Read the NASA reference ↗</a>
        </section>
        <section className="panel section">
          <h3>Spaceflight research timeline</h3><p>These phases are background context, not predictions driven by the simulation clock.</p>
          <div className="crew-system-buttons" role="group" aria-label="Mission phase">
            {phases.map(([label],index)=><button key={label} aria-pressed={phase===index} onClick={()=>setPhase(index)}>{label}</button>)}
          </div>
          <p>{phases[phase][1]}</p>
          <a href="https://www.nasa.gov/humans-in-space/the-human-body-in-space/" target="_blank" rel="noreferrer">Explore NASA’s human spaceflight research ↗</a>
        </section>
        <section className="panel section">
          <h3>This simulation · current sample</h3>
          <p>The simulation calculates air concentrations. Organ readings and individual health outcomes require physiological data.</p>
          {sample && <div className="stats">
            <div>Elapsed model time <b>{sample.t} s</b></div>
            <div>Cabin CO₂ <b>{ppm(sample.cabin)}</b></div>
            <div>Breathing-zone CO₂ <b>{masked?'Masked':ppm(sample.local)}</b></div>
            <div>Selected reference <b>{rule.label}</b></div>
          </div>}
          <p>{rule.description}</p>
        </section>
      </div>
    </div>
  </>
}