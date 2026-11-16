import { CartesianGrid, Line, LineChart, ReferenceLine, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
export const colors = ['#80B7E8', '#a2b8d1', '#36BFA7', '#b3a2dc', '#e9ac54']
export function TelemetryChart({data, series, unit, time = false, threshold, cursor, events = []}: {data: object[]; series: {key: string; label: string}[]; unit: string; time?: boolean; threshold?: number; cursor?: number; events?: {time?: number; label: string}[]}) {
  const format = (t: number) => time ? new Date(t).toISOString().slice(5,16).replace('T',' ') : String(t)
  return <div className="chart" role="img" aria-label={series.map(s => s.label).join(', ') + ' in ' + unit}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={data} margin={{top:10,right:16,bottom:5,left:0}}>
        <CartesianGrid stroke="#25394b" vertical={false} />
        <XAxis dataKey="t" type="number" domain={['dataMin','dataMax']} tickFormatter={format} tick={{fill:'#a8b8c8',fontSize:11}} minTickGap={34}/>
        <YAxis width={53} tick={{fill:'#a8b8c8',fontSize:11}} domain={['auto','auto']}/>
        <Tooltip labelFormatter={value => time ? format(Number(value)) + ' UTC' : value + ' s'} formatter={value => typeof value === 'number' ? value.toFixed(2) + ' ' + unit : 'Missing'} contentStyle={{background:'#111e30',border:'1px solid #34506a'}} />
        {threshold != null && <ReferenceLine y={threshold} stroke="#e2b66d" strokeDasharray="5 5" label={{value:'Experiment rule',position:'insideTopRight',fill:'#e2b66d',fontSize:11}}/>}
        {cursor != null && <ReferenceLine x={cursor} stroke="#b4bfcc"/>}
        {threshold != null && events.map((event,index)=>event.time != null && <ReferenceDot key={event.label} x={event.time} y={threshold} r={index ? 3 : 6} fill={index ? '#80b7e8' : '#111318'} stroke={index ? '#80b7e8' : '#e2b66d'}/>)}
        {series.map((s,i) => <Line key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={colors[i % colors.length]} dot={data.length === 1} strokeWidth={2} strokeDasharray={i % 2 ? "6 4" : undefined} connectNulls={false} isAnimationActive={false}/>)}
      </LineChart>
    </ResponsiveContainer>
  </div>
}
