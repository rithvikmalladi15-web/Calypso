import { parseCsv } from './nasaCsvParser'

const bundledChecksum = '1117dd51b7e869119b0426dd1a57c7c42a0a4edf502b7b18a8a280f0b7d0c531'
export async function loadDefault(signal?: AbortSignal) {
  const response = await fetch(import.meta.env.BASE_URL + 'data/nasa-iss-telemetry.csv', { signal })
  if (response.status === 404 || response.headers.get('content-type')?.includes('text/html')) return null
  if (!response.ok) throw new Error('Could not load the default telemetry file.')
  const bytes = await response.arrayBuffer()
  const digest = globalThis.crypto?.subtle ? await crypto.subtle.digest('SHA-256', bytes) : null
  const checksum = digest && Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('')
  return {
    dataset: parseCsv(new TextDecoder().decode(bytes)),
    filename: checksum === bundledChecksum ? 'RR-1_EDA_Telemetry_table.csv' : 'nasa-iss-telemetry.csv',
  }
}
