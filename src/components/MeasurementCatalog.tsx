import { useMemo, useState } from 'react'
import type { Point } from '../simulation/engine'
import { isLocal, reading, threshold, type Sensor } from '../simulation/sensorModel'

const statistics = ['First sample','Last sample','Net change','Minimum','Maximum','Mean','Median','10th percentile','90th percentile','Standard deviation'] as const
const channels = [
  {label:'Cabin CO₂', unit:'ppm', local:false},
  {label:'Breathing-zone CO₂', unit:'ppm', local:true},
  {label:'Breathing zone minus cabin', unit:'ppm', local:true},
  {label:'Highest virtual sensor reading', unit:'ppm', local:false},
  {label:'Absolute error of highest sensor vs. breathing zone', unit:'ppm', local:true},
  {label:'Cabin CO₂ above experiment rule', unit:'ppm', local:false},
  {label:'Breathing-zone CO₂ above experiment rule', unit:'ppm', local:true},
  {label:'Highest sensor reading above experiment rule', unit:'ppm', local:false},
  {label:'Cabin CO₂ rate of change', unit:'ppm/s', local:false},
  {label:'Breathing-zone CO₂ rate of change', unit:'ppm/s', local:true},
]

function summarize(samples:number[]) {
  if (!samples.length) return []
  const sorted = [...samples].sort((a,b)=>a-b)
  const first = samples[0], last = samples[samples.length-1]
  const mean = samples.reduce((sum,value)=>sum+value,0)/samples.length
  function percentile(fraction:number) {
    const index = (sorted.length-1)*fraction
    const lower = Math.floor(index)
    return sorted[lower]+(sorted[Math.ceil(index)]-sorted[lower])*(index-lower)
  }
  const deviation = Math.sqrt(samples.reduce((sum,value)=>sum+(value-mean)**2,0)/samples.length)
  return [first,last,last-first,sorted[0],sorted[sorted.length-1],mean,percentile(.5),percentile(.1),percentile(.9),deviation]
}

export function MeasurementCatalog({points,sensors,noise,masked}:{
  points:Point[]; sensors:Sensor[]; noise:number; masked:boolean
}) {
  const [selection,setSelection] = useState(0)
  const index = masked && channels[selection].local ? 0 : selection
  const channel = channels[index]
  const values = useMemo(()=>{
    const eligibleSensors = masked ? sensors.filter(sensor=>!isLocal(sensor)) : sensors
    const samples:number[] = []
    for (const [i,point] of points.entries()) {
      const previous = points[i-1]
      const sensor = eligibleSensors.length ? Math.max(...eligibleSensors.map(s=>reading(point,s,noise))) : undefined
      const duration = previous ? point.t-previous.t : 0
      const entries = [
        point.cabin, point.local, point.local-point.cabin, sensor,
        sensor===undefined ? undefined : Math.abs(sensor-point.local),
        Math.max(0,point.cabin-threshold), Math.max(0,point.local-threshold),
        sensor===undefined ? undefined : Math.max(0,sensor-threshold),
        previous && duration>0 ? (point.cabin-previous.cabin)/duration : undefined,
        previous && duration>0 ? (point.local-previous.local)/duration : undefined,
      ]
      const value = entries[index]
      if (value!==undefined) samples.push(value)
    }
    return summarize(samples)
  },[points,sensors,noise,masked,index])

  return <details className="panel section">
    <summary>Measurement catalog · {channels.filter(item=>!masked || !item.local).length*statistics.length} metrics</summary>
    <p>Each signal has ten statistics calculated from the recorded run. Sensor statistics use the current layout and noise setting across those samples.</p>
    <label className="field">Signal
      <select value={index} onChange={event=>setSelection(Number(event.target.value))}>
        {channels.map((item,i)=>(!masked || !item.local) && <option value={i} key={item.label}>{item.label}</option>)}
      </select>
    </label>
    <div className="stats">
      {statistics.map((label,i)=><div key={label}>{label}<b>{values[i]===undefined ? 'Unavailable' : values[i].toLocaleString(undefined,{maximumFractionDigits:3})+' '+channel.unit}</b></div>)}
    </div>
    <p>Mean and standard deviation weight samples equally. Percentiles use linear interpolation. Rates use the time between consecutive samples. Values above the experiment rule are zero when the reading is at or below {threshold.toLocaleString()} ppm.</p>
    {masked && <p>Reveal the breathing zone to see the remaining metrics.</p>}
  </details>
}
