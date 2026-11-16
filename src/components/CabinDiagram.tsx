import { useRef } from 'react'
import { isLocal, zone, type Sensor } from '../simulation/sensorModel'
import type { Point } from '../simulation/engine'

export function CabinDiagram({point, sensors, heat, coverage, hidden, onMove}: {
  point: Point; sensors: Sensor[]; airflow: boolean; heat: boolean; coverage: boolean; hidden: boolean
  playing: boolean; ventilation: number; onMove?: (id: string,x: number,y: number) => void
}) {
  const selected = useRef<string | null>(null)
  return <div className="credited-illustration"><svg className="cabin" viewBox="0 0 800 470" role="img" aria-label="Two-compartment schematic of a crew member in a spacecraft cabin. Sensor controls are available below the diagram.">
    <defs>
      <pattern id="draft" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#244257" strokeWidth=".6"/></pattern>
      <linearGradient id="suit" x2="1" y2="1"><stop stopColor="#d5e1e9"/><stop offset=".57" stopColor="#859daf"/><stop offset="1" stopColor="#465f74"/></linearGradient>
      <linearGradient id="visor" x2="1" y2="1"><stop stopColor="#416477"/><stop offset=".48" stopColor="#193349"/><stop offset="1" stopColor="#0b1625"/></linearGradient>
    </defs>
    <rect width="800" height="470" fill="#070a0e"/><rect width="800" height="470" className="cabin-grid" fill="url(#draft)"/>
    <path d="M135 53H665L744 126V344L665 417H135L56 344V126Z" fill="#0c121a" stroke="#39596f" strokeWidth="2"/>
    <path d="M219 104H581L643 163V306L581 367H219L157 306V163Z" fill="#101923" stroke="#48687c" strokeWidth="2"/>
    <g fill="none" stroke="#345267"><path d="M135 53l84 51m446-51-84 51m163 22-101 37M56 126l101 37M56 344l101-38m587 38-101-38m22 111-84-50m-446 50 84-50M157 235h486M357 367l-40 50m126-50 40 50"/><path d="M79 151h53v171H79zm589 0h53v171h-53zM228 124h344v44H228z"/></g>
    <g fill="#203d53" stroke="#527185"><rect x="241" y="137" width="104" height="19" rx="2"/><rect x="455" y="137" width="104" height="19" rx="2"/>{[0,1,2,3,4,5].map(i=><path key={i} d={'M'+(251+16*i)+' 141v11m214-11v11'}/>)}<rect x="86" y="173" width="39" height="68" rx="3"/><rect x="675" y="173" width="39" height="68" rx="3"/><path d="M88 265h35m-35 12h35m-35 12h35m554-24h35m-35 12h35m-35 12h35"/></g>
    <g fill="#6aa9b8"><circle cx="98" cy="186" r="2"/><circle cx="106" cy="186" r="2"/><circle cx="690" cy="186" r="2"/><circle cx="698" cy="186" r="2"/></g>
    <g transform="translate(24 0)" stroke="#293645" strokeWidth="3">
      <path d="M350 220q-23-8-38 17l-27 55q-5 13 9 20 10 5 18-7l35-49m103-36q23-8 38 17l27 55q5 13-9 20-10 5-18-7l-35-49" fill="url(#suit)"/>
      <path d="M356 297h88l14 69q4 15-11 19h-21q-12-3-15-15l-11-52-11 52q-3 12-15 15h-21q-15-4-11-19z" fill="url(#suit)"/>
      <path d="M338 253q0-39 34-48h56q34 9 34 48l-15 43q-5 15-23 18h-48q-18-3-23-18z" fill="url(#suit)"/>
      <rect x="373" y="238" width="54" height="34" rx="5" fill="#34475a"/>
      <path d="M382 251h18m-18 7h12m-45 24h102m-99 74h37m22 0h37" stroke="#60778a"/>
      <circle cx="416" cy="253" r="3" fill="#80b7e8" stroke="none"/>
      <circle cx="400" cy="174" r="48" fill="url(#suit)"/>
      <path d="M363 173q3-31 37-32t37 32q-1 29-37 32-36-3-37-32z" fill="url(#visor)" stroke="#818fa0"/>
      <path d="M373 162q8-13 26-13" fill="none" stroke="#7797ad" strokeWidth="2"/>
    </g>
    <g fill="none" stroke="#7596b2" strokeWidth="1" opacity=".65" aria-hidden="true">
      <path d="M32 79V57h28m680 0h28v22M32 391v22h28m680 0h28v-22"/>
      <path d="M400 57v9m0 338v9M32 235h10m716 0h10"/>
    </g>
    {!hidden && <g transform={`translate(${zone.x*800} ${zone.y*470})`} fill="none" stroke="#80b7e8" pointerEvents="none" aria-hidden="true">
      <path d="M-150 0h20m260 0h20M0-92v19m0 146v19" opacity=".75"/>
      <path d="M-18 0h8m20 0h8M0-18v8m0 20v8" opacity=".6"/>
      <circle r="3" opacity=".8"/>
    </g>}
    {heat && !hidden && <ellipse cx={zone.x*800} cy={zone.y*470} rx={zone.radius*800} ry={zone.radius*470} fill="#80b7e8" opacity={Math.min(.55,Math.max(0,(point.local-point.cabin)/1200))}/>}
    {!hidden && <ellipse cx={zone.x*800} cy={zone.y*470} rx={zone.radius*800} ry={zone.radius*470} fill="none" stroke="#91a8bc" opacity=".62" strokeDasharray="3 6"/>}
    {sensors.map(s=><g key={s.id} transform={'translate('+s.x*800+' '+s.y*470+')'}>
      {coverage && <circle r="32" fill="#80b7e8" fillOpacity=".13" stroke="#80b7e8" strokeOpacity=".5" strokeDasharray="3 3"/>}
      <circle r="13" fill="#0b2033" stroke="#80b7e8" strokeWidth="1.5"/>
      <text textAnchor="middle" y="4" className="svg-label" fill="#baf5fc">{s.id}</text>
      <circle r="19" fill="transparent" className={onMove ? 'drag-sensor' : ''} onPointerDown={onMove ? e=>{ selected.current=s.id; e.currentTarget.setPointerCapture(e.pointerId) } : undefined} onPointerUp={()=>selected.current=null} onPointerCancel={()=>selected.current=null} onPointerMove={e=>{
        if (!onMove || selected.current!==s.id) return
        const matrix = e.currentTarget.ownerSVGElement?.getScreenCTM()
        if (!matrix) return
        const p = new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse())
        onMove(s.id,p.x/800,p.y/470)
      }}/>
    </g>)}
    {!hidden && <g fill="#9eeaf4" className="svg-label"><path d="M535 160l35-35h115" stroke="#6f9bac" fill="none"/><text x="575" y="117">BREATHING ZONE</text><text x="575" y="140">{Math.round(point.local)} ppm</text></g>}
    {sensors.slice(0,1).map(s=><g key={s.id} className="svg-label" fill="#9eeaf4"><path d={'M'+s.x*800+' '+s.y*470+'l'+(s.x>.7?-25:25)+'-30h'+(s.x>.7?-90:90)} fill="none" stroke="#6f9bac"/><text x={s.x*800+(s.x>.7?-30:30)} y={s.y*470-36} textAnchor={s.x>.7?'end':'start'}>{s.id} · ACTIVE SENSOR</text></g>)}
    <g className="svg-label" fill="#a8b8c8">
      <text x="22" y="28">Conceptual two-volume schematic</text>
      <text x="22" y="448">CABIN AIR</text><text x="778" y="448" textAnchor="end">{hidden ? 'Cabin sensor view' : 'Dashed outline · modeled breathing zone'}</text>
    </g>
    <g pointerEvents="none">
      <text x="30" y="47" fontSize="12" fill="#b4bfcc" opacity=".75">Made by AI</text>
    </g>
  </svg><span className="ai-image-credit">Made by AI · Conceptual illustration</span></div>
}
export const zoneName = (sensor: Sensor) => isLocal(sensor) ? 'Breathing zone' : 'Cabin'
