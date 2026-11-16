import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { loadDefault } from '../data/nasaDataLoader'
import { measurement, parseCsv, units, type Column, type Metric } from '../data/nasaCsvParser'
import { TelemetryChart, colors } from '../components/TelemetryChart'
import { useData, type Dataset } from '../stores/dataStore'

function utc(value?: string) {
  const raw = value?.trim() ?? ''
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(raw)) return NaN
  return Date.parse(raw.replace(' ', 'T') + (/Z$|[+-]\d{2}:?\d{2}$/i.test(raw) ? '' : 'Z'))
}
export function NASADataPage() {
  const {data,name,columns,timestamp,metric,apply:applyData}=useData()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!data)
  const setColumns = (update: (columns: Column[])=>Column[]) => useData.setState(state=>({columns:update(state.columns)}))
  const [windowSize, setWindowSize] = useState(1000)
  const [start, setStart] = useState(0)
  const request = useRef(0)
  function apply(dataset: Dataset, filename: string) {
    applyData(dataset,filename)
    setStart(0)
  }
  useEffect(() => {
    if (useData.getState().data) return
    const controller = new AbortController()
    const id = ++request.current
    loadDefault(controller.signal).then(d => {
      if (id === request.current && d) apply(d.dataset, d.filename)
    }).catch(e => { if (id === request.current && !controller.signal.aborted) setError(String(e.message)) })
      .finally(() => { if (id === request.current && !controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  async function open(file?: File) {
    if (!file) return
    const id = ++request.current
    setError(''); setLoading(true)
    try {
      if (!/\.csv$/i.test(file.name) || file.size > 20_000_000) throw new Error('Choose a CSV file smaller than 20 MB.')
      const result = parseCsv(await file.text())
      if (id === request.current) apply(result, file.name)
    } catch (e) { if (id === request.current) setError((e as Error).message) }
    finally { if (id === request.current) setLoading(false) }
  }
  const active = useMemo(() => columns.filter(c => c.metric === metric && c.unit && c.header !== timestamp), [columns, metric, timestamp])
  const observations = useMemo(() => (data?.rows ?? []).flatMap((row, i) => {
    const t = timestamp ? utc(row[timestamp]) : i + 1
    if (!Number.isFinite(t)) return []
    return [{t, ...Object.fromEntries(active.map((c, index) => ['series'+index, measurement(row[c.header], c)]))} as Record<string, number | null> & {t: number}]
  }).sort((a,b) => a.t - b.t), [data, timestamp, active])
  const unit = units[metric][0]
  const first = Math.min(start, Math.max(0, observations.length - windowSize))
  const rr1Cadence = name === 'RR-1_EDA_Telemetry_table.csv' && timestamp === 'Controller_Time_GMT'
  const gapCount = rr1Cadence ? observations.filter((row,i)=>i > 0 && row.t-observations[i-1].t > 300_000).length : 0
  const visibleRows = observations.slice(first,first+windowSize)
  const chartRows = visibleRows.flatMap((row,i) => rr1Cadence && i > 0 && row.t-visibleRows[i-1].t > 300_000
    ? [{t:visibleRows[i-1].t+300_000},row] : [row])
  const usable = observations.filter(row => active.some((_,i) => row['series'+i] !== null)).length
  function update(header: string, patch: Partial<Column>) {
    setColumns(existing => existing.map(c => c.header === header ? {...c,...patch} : c))
  }
  return <>
    <div className="page-heading"><h1>NASA Data</h1><p>Explore reported environmental measurements with their original context and gaps.</p></div>
    <section className="panel upload" onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); void open(e.dataTransfer.files[0])}}>
      <Upload size={21}/><div><strong>{loading ? 'Loading telemetry…' : name || 'Import NASA CSV'}</strong><p>Drop a CSV here or browse. Browser imports are held in memory.</p></div>
      <label className="button">Browse CSV<input type="file" accept=".csv,text/csv" onChange={e => {void open(e.target.files?.[0]); e.target.value = ''}} /></label>
    </section>
    {error && <p role="alert" className="notice">{error}</p>}
    {data && <>
      <section className="panel section">
        <div className="section-title"><h2>Environmental measurements</h2><select aria-label="Measurement" value={metric} onChange={e=>useData.setState({metric:e.target.value as Metric})}>{Object.keys(units).map(m=><option key={m}>{m}</option>)}</select></div>
        <p>{usable.toLocaleString()} usable {metric} rows of {data.rows.length.toLocaleString()} original rows · {(data.rows.length - observations.length).toLocaleString()} invalid timestamps{rr1Cadence && ' · '+gapCount.toLocaleString()+' intervals longer than 5 min'}</p>
        <p>{name.startsWith('RR-1_') ? 'RR-1 · experiment environmental telemetry' : data.mission ? 'Mission field · ' + (data.rows[0]?.[data.mission] || 'unspecified') : 'Mission unspecified'}{data.location && ' · ' + (data.rows[0]?.[data.location] || 'location unspecified')}. Context is determined from the export and header labels. These readings describe the measured experiment environment.</p>
        {usable ? <><div className="legend">{active.map((c,i)=><span key={c.header} style={{color:colors[i % colors.length]}}>{c.location} · {c.header} ({observations.filter(row=>row['series'+i] !== null).length.toLocaleString()})</span>)}</div>
          <TelemetryChart data={chartRows} series={active.map((c,i)=>({key:'series'+i,label:c.location+' · '+c.header}))} unit={unit} time={!!timestamp}/>
          <label className="range-label">Chart window · rows {first+1}–{Math.min(first+windowSize,observations.length)}<input type="range" min={0} max={Math.max(0,observations.length-windowSize)} value={first} onChange={e=>setStart(+e.target.value)}/></label>
          <label>Rows per window <select value={windowSize} onChange={e=>setWindowSize(+e.target.value)}>{[200,1000,3000].map(n=><option key={n}>{n}</option>)}</select></label>
          <p>{timestamp && observations.length > 0 && <>Source range · {new Date(observations[0].t).toISOString()} to {new Date(observations[observations.length-1].t).toISOString()}<br/></>}Horizontal axis · {timestamp ? 'UTC (offset-free timestamps treated as UTC)' : 'source row index'} · Vertical axis · {unit}</p></> : <p>No usable observations for this measurement. Review the column mapping and units below.</p>}
      </section>
      <details className="panel section"><summary>Measurement completeness</summary>
        <ul>{active.map((column,index)=>{
          const count=observations.filter(row=>row['series'+index] !== null).length
          return <li key={column.header}>{column.location} · {column.header} · {count.toLocaleString()} available · {(observations.length-count).toLocaleString()} missing or invalid among rows with valid timestamps</li>
        })}</ul>
      </details>
      <details className="panel section" open={!usable}><summary>Column mapping and units</summary>
        <label className="field">Timestamp<select value={timestamp} onChange={e=>useData.setState({timestamp:e.target.value})}><option value="">Use source row index</option>{data.headers.map(h=><option key={h}>{h}</option>)}</select></label>
        {data.headers.filter(h=>h!==timestamp).map(h => {
          const c = columns.find(column=>column.header===h)
          return <div className="mapping" key={h}><code>{h}</code>
            <select aria-label={h+' measurement'} value={c?.metric ?? ''} onChange={e=>{
              const m=e.target.value as Metric
              setColumns(prev=>[...prev.filter(x=>x.header!==h), ...(m ? [{header:h,metric:m,unit:'' as const,location:c?.location ?? 'Unspecified'}] : [])])
            }}><option value="">Ignore</option>{Object.keys(units).map(m=><option key={m}>{m}</option>)}</select>
            {c && <><select aria-label={h+' unit'} value={c.unit} onChange={e=>update(h,{unit:e.target.value as Column['unit']})}><option value="">Confirm units</option>{units[c.metric].map(u=><option key={u}>{u}</option>)}</select>
              <select aria-label={h+' location'} value={c.location} onChange={e=>update(h,{location:e.target.value})}>{['Unspecified','ISS flight','Ground control'].map(l=><option key={l}>{l}</option>)}</select></>}
          </div>
        })}
      </details>
    </>}
  </>
}
