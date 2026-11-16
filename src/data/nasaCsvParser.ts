import Papa from 'papaparse'
export const units = {
  'CO₂': ['ppm', 'ppb'], Temperature: ['°C', '°F'], Humidity: ['%', 'fraction'],
  Oxygen: ['%', 'fraction'], Pressure: ['kPa', 'Pa', 'hPa', 'mmHg'],
  'Air speed': ['m/s', 'cm/s'], 'Carbon monoxide': ['ppm', 'ppb'],
  'Particulate matter': ['µg/m³'], 'Sound level': ['dBA'], 'Light level': ['lux'],
  'Radiation dose rate': ['µSv/h'], 'Power': ['W', 'kW'],
} as const
export type Metric = keyof typeof units
export type Unit = (typeof units)[Metric][number]
export type Column = { header: string; metric: Metric; unit: Unit | ''; location: string }
export function parseCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim() })
  const headers = parsed.meta.fields ?? []
  if (headers.length < 2 || !parsed.data.length || parsed.errors.length) throw new Error(parsed.errors[0]?.message ?? 'Expected a CSV with headers and at least one data row.')
  const columns: Column[] = []
  for (const header of headers) {
    const h = header.toLowerCase()
    const metric = /co.?2|carbon.dioxide/.test(h) ? 'CO₂' : /temp/.test(h) ? 'Temperature' : /humidity|\brh\b|^rh_/.test(h) ? 'Humidity' : undefined
    if (!metric) continue
    const unit = units[metric].find(u => h.includes(({ '°C': 'degc', '°F': 'degf', '%': 'percent' } as Record<string,string>)[u] ?? u))
    columns.push({ header, metric, unit: unit ?? '', location: /ground/.test(h) ? 'Ground control' : /iss|flight/.test(h) ? 'ISS flight' : 'Unspecified' })
  }
  return { headers, rows: parsed.data, columns, time: headers.find(h => /date|time/.test(h.toLowerCase())) ?? '', mission: headers.find(h => /mission/.test(h.toLowerCase())) ?? '', location: headers.find(h => /location|site/.test(h.toLowerCase())) ?? '' }
}
export function measurement(value: string | undefined, column: Column) {
  if (!value?.trim() || !column.unit || !(units[column.metric] as readonly Unit[]).includes(column.unit)) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const factors: Partial<Record<Unit, number>> = { ppb:.001, fraction:100, Pa:.001, hPa:.1, mmHg:.133322387, 'cm/s':.01, kW:1000 }
  const converted = column.unit === '°F' ? (n - 32) * 5 / 9 : n * (factors[column.unit] ?? 1)
  if (!Number.isFinite(converted)) return null
  if (column.metric === 'Temperature') return converted >= -273.15 ? converted : null
  if (column.metric === 'Sound level') return converted
  if (converted < 0) return null
  if (['Humidity','Oxygen'].includes(column.metric) && converted > 100) return null
  if (['CO₂','Carbon monoxide'].includes(column.metric) && converted > 1e6) return null
  return converted
}
