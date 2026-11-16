import Papa from 'papaparse'
export type Metric = 'CO₂' | 'Temperature' | 'Humidity'
export type Unit = 'ppm' | 'ppb' | '°C' | '°F' | '%' | 'fraction'
export const units: Record<Metric, Unit[]> = { 'CO₂': ['ppm', 'ppb'], Temperature: ['°C', '°F'], Humidity: ['%', 'fraction'] }
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
  if (!value?.trim() || !column.unit || !units[column.metric].includes(column.unit)) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const converted = column.unit === 'ppb' ? n / 1000 : column.unit === '°F' ? (n - 32) * 5 / 9 : column.unit === 'fraction' ? n * 100 : n
  if ((column.metric !== 'Temperature' && converted < 0) || (column.metric === 'Humidity' && converted > 100) || (column.metric === 'CO₂' && converted > 1e6) || (column.metric === 'Temperature' && converted < -273.15)) return null
  return converted
}
