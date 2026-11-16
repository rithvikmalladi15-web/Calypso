import { useEffect, useState } from 'react'
import { loadDefault } from '../data/nasaDataLoader'
import { useSim } from '../stores/simulationStore'
import { measurement } from '../data/nasaCsvParser'
export function ModelComparison() {
  const points=useSim(s=>s.points)
  const scenario=useSim(s=>s.scenario)
  const [ranges,setRanges]=useState<{name:string;min:number;max:number;count:number;missing:number}[]>([])
  const [status,setStatus]=useState('Loading bundled RR-1 comparison…')
  useEffect(()=>{
    const controller=new AbortController()
    loadDefault(controller.signal).then(result=>{
      if (!result || result.filename!=='RR-1_EDA_Telemetry_table.csv') {setStatus('Bundled RR-1 identity could not be verified. Comparison unavailable.');return}
      const {dataset}=result
      setRanges(dataset.columns.filter(c=>c.metric==='CO₂').map(column=>{
        const values=dataset.rows.map(row=>measurement(row[column.header],column)).filter((v):v is number=>v!=null)
        return {name:column.location,min:Math.min(...values),max:Math.max(...values),count:values.length,missing:dataset.rows.length-values.length}
      }))
      setStatus('')
    }).catch(()=>{if(!controller.signal.aborted)setStatus('Could not load RR-1 comparison.')})
    return ()=>controller.abort()
  },[])
  const min=Math.min(...points.map(p=>p.cabin)),max=Math.max(...points.map(p=>p.cabin))
  const fmt=(v:number)=>v.toLocaleString(undefined,{maximumFractionDigits:1})
  return <section className="panel section" aria-label="Model comparison with RR-1"><h2>Model comparison · context, not calibration</h2>
    <p>Current model cabin output beside the complete bundled RR-1 CO₂ ranges. Imported files do not replace this reference. No timestamps are aligned and no fit is performed.</p>
    <div className="stats"><div>Modeled cabin · {scenario}<b>{fmt(min)}–{fmt(max)} ppm</b>{points.at(-1)!.t-points[0].t} s · {points.length} samples</div>{ranges.map(r=><div key={r.name}>Measured RR-1 · {r.name}<b>{r.count?`${fmt(r.min)}–${fmt(r.max)} ppm`:'No valid samples'}</b>{r.count.toLocaleString()} valid · {r.missing.toLocaleString()} missing/invalid</div>)}</div>
    {status && <p role="status">{status}</p>}
    {ranges.filter(r=>r.count>0).map(r=><p key={r.name}><strong>{r.name}:</strong> {max>=r.min&&min<=r.max?'The modeled cabin range overlaps the measured range.':'The modeled cabin range does not overlap the measured range.'} Range overlap alone cannot validate the dynamics or sensor-detection result.</p>)}
    <p><strong>What matches:</strong> both report CO₂ concentration in ppm. <strong>What does not:</strong> RR-1 describes the experiment’s flight/ground environment; this model uses two assumed volumes, an illustrative human source, and constant exchange/removal settings. RR-1 supplies no matched human breathing-zone trace or sensor-placement experiment here.</p>
    <p><strong>Not calibrated:</strong> the 650 ppm initial condition and coefficients were not estimated from RR-1. Measurement location, experimental conditions, cadence and duration differ. TODO: obtain matched cabin and breathing-zone measurements with documented airflow and source conditions before fitting parameters or claiming predictive accuracy.</p>
    <a href="https://visualization.osdr.nasa.gov/eda/" target="_blank" rel="noreferrer">NASA Environmental Data Application · dataset context ↗</a>
  </section>
}
