import { useState, type ComponentProps } from 'react'
import { CabinDiagram } from './CabinDiagram'
import { cabinSensor, isLocal, localSensor } from '../simulation/sensorModel'
export function CabinView(props:ComponentProps<typeof CabinDiagram>&{noise?:number}) {
  const [selected,setSelected]=useState(props.sensors[0]?.id??'')
  const eligible=props.sensors.filter(item=>!props.hidden||!isLocal(item))
  const sensor=eligible.find(item=>item.id===selected)??eligible[0]
  return <section className="cabin-view-modes" aria-label="Cabin illustration">
    <CabinDiagram {...props}/>
    {sensor&&<div className="scene-placement"><label>Selected sensor<select value={sensor.id} onChange={event=>setSelected(event.target.value)}>{props.sensors.filter(item=>!props.hidden||!isLocal(item)).map(item=><option key={item.id}>{item.id}</option>)}</select></label>
      {props.onMove&&<><button onClick={()=>props.onMove?.(sensor.id,cabinSensor.x,cabinSensor.y)}>Place in cabin</button><button onClick={()=>props.onMove?.(sensor.id,localSensor.x,localSensor.y)}>Place in breathing zone</button></>}
    </div>}
    <p className="scene-help">Conceptual schematic, not a spatial simulation. The boundary selects which modeled volume a sensor samples.</p>
  </section>
}
