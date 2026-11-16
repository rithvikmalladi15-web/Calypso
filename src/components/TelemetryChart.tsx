import { usePreferences } from '../app/SettingsContext'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
export const colors = ['#80B7E8', '#F0C46A', '#69C7AF', '#D697CE', '#E59A70']
export function TelemetryChart({data, series, unit, time = false, threshold, reference, cursor, events = []}: {data: object[]; series: {key: string; label: string}[]; unit: string; time?: boolean; threshold?: number; reference?: {value:number;label:string}; cursor?: number; events?: {time?: number; label: string}[]}) {
  const quality = usePreferences()?.preferences.quality ?? 'Medium'
  const format = (t: number) => time ? new Date(t).toISOString().slice(5,16).replace('T',' ') : String(t)
  return <div className="chart" role="img" aria-label={series.map(s => s.label).join(', ') + ' in ' + unit}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={data} margin={{top:10,right:16,bottom:12,left:4}}>
        <CartesianGrid stroke="#25394b" vertical={false} />
        <XAxis dataKey="t" type="number" domain={['dataMin','dataMax']} tickFormatter={format} tick={{fill:'#a8b8c8',fontSize:11}} minTickGap={quality === 'Low' ? 55 : 34} label={{value:time ? 'Time (UTC)' : 'Elapsed time (s)',position:'insideBottom',offset:-5,fill:'#a8b8c8',fontSize:11}}/>
        <YAxis label={{value:unit,angle:-90,position:'insideLeft',fill:'#a8b8c8',fontSize:11}} width={58} tick={{fill:'#a8b8c8',fontSize:11}} domain={['auto','auto']}/>
        <Legend wrapperStyle={{fontSize:12,paddingTop:8}}/>
        <Tooltip labelFormatter={value => time ? format(Number(value)) + ' UTC' : value + ' s'} formatter={value => typeof value === 'number' ? value.toFixed(2) + ' ' + unit : 'Missing'} contentStyle={{background:'#111e30',border:'1px solid #34506a'}} />
        {threshold != null && <ReferenceLine y={threshold} stroke="#e2b66d" strokeDasharray="5 5" label={{value:'Experiment rule',position:'insideTopRight',fill:'#e2b66d',fontSize:11}}/>}
        {reference && <ReferenceLine ifOverflow="extendDomain" y={reference.value} stroke="#a8b8c8" strokeDasharray="3 5" label={{value:reference.label,position:'insideTopRight',fill:'#a8b8c8',fontSize:10}}/>}
        {cursor != null && <ReferenceLine x={cursor} stroke="#b4bfcc"/>}
        {threshold != null && events.map((event,index)=>event.time != null && <ReferenceDot key={event.label} x={event.time} y={threshold} r={index ? 3 : 6} fill={index ? '#80b7e8' : '#111318'} stroke={index ? '#80b7e8' : '#e2b66d'}/>)}
        {series.map((s,i) => <Line key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={colors[i % colors.length]} dot={data.length === 1} strokeWidth={2} strokeDasharray={i % 2 ? "6 4" : undefined} connectNulls={false} isAnimationActive={false}/>)}
      </LineChart>
    </ResponsiveContainer>
  </div>
}
