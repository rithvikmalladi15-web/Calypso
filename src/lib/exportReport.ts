import type { Experiment } from '../stores/experimentStore'
export const serializeReport = (record: Experiment) => JSON.stringify(record,null,2)
export function downloadReport(record: Experiment) {
  const url = URL.createObjectURL(new Blob([serializeReport(record)],{type:'application/json'}))
  const link = document.createElement('a')
  link.href=url
  link.download='calypso-'+record.id+'.json'
  link.click()
  window.setTimeout(()=>URL.revokeObjectURL(url), 1000)
}
