import { create } from 'zustand'
import type { Column, Metric, parseCsv } from '../data/nasaCsvParser'

export type Dataset = ReturnType<typeof parseCsv>
type DataState = {
  data: Dataset | null
  name: string
  columns: Column[]
  timestamp: string
  metric: Metric
  apply: (data: Dataset, name: string) => void
}

export const useData = create<DataState>(set=>({
  data:null, name:'', columns:[], timestamp:'', metric:'CO₂',
  apply: (data,name)=>set({
    data,name,columns:data.columns,timestamp:data.time,
    metric:data.columns.some(c=>c.metric==='CO₂' && c.unit) ? 'CO₂' : data.columns[0]?.metric ?? 'CO₂',
  }),
}))
