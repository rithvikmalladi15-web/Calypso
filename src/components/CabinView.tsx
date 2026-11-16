import { lazy, Suspense, useState, type ComponentProps } from 'react'
import { CabinDiagram } from './CabinDiagram'
import { cabinSensor, isLocal, localSensor } from '../simulation/sensorModel'
const ScientificScene=lazy(()=>import('./ScientificScene'))
export function CabinView(props:ComponentProps<typeof CabinDiagram>&{noise?:number}) {
  const [three,setThree]=useState(()=>typeof WebGL2RenderingContext!=='undefined')
  const [unavailable,setUnavailable]=useState(false)
  const [selected,setSelected]=useState(props.sensors[0]?.id??'')
  const eligible=props.sensors.filter(item=>!props.hidden||!isLocal(item))
  const sensor=eligible.find(item=>item.id===selected)??eligible[0]
  return <section className="cabin-view-modes" aria-label="Cabin illustration">
    <div className="scene-mode" role="group" aria-label="Cabin illustration mode"><button aria-pressed={three} onClick={()=>setThree(true)}>3D cabin</button><button aria-pressed={!three} onClick={()=>setThree(false)}>2D schematic</button></div>
    {unavailable&&<p className="scene-help" role="status">3D is unavailable on this device. The 2D schematic and simulation still work.</p>}
    {three?<Suspense fallback={<p className="scene-help">Loading interactive cabin…</p>}><ScientificScene kind="cabin" point={props.point} sensors={props.sensors} noise={props.noise} hidden={props.hidden} heat={props.heat} onSensor={setSelected} onUnavailable={()=>{setThree(false);setUnavailable(true)}}/></Suspense>:<CabinDiagram {...props}/>}
    {three&&sensor&&<div className="scene-placement"><label>Selected sensor<select value={sensor.id} onChange={event=>setSelected(event.target.value)}>{props.sensors.filter(item=>!props.hidden||!isLocal(item)).map(item=><option key={item.id}>{item.id}</option>)}</select></label>
      {props.onMove&&<><button onClick={()=>props.onMove?.(sensor.id,cabinSensor.x,cabinSensor.y)}>Place in cabin</button><button onClick={()=>props.onMove?.(sensor.id,localSensor.x,localSensor.y)}>Place in breathing zone</button></>}
    </div>}
    <p className="scene-help">Conceptual schematic, not a spatial simulation. The volume boundary selects a concentration; rotating the view does not change the physics.</p>
  </section>
}
