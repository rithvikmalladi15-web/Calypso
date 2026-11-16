import type { Experiment } from '../stores/experimentStore'
export function explain(record: Experiment) {
  const last = record.points[record.points.length-1]
  const gap = Math.round(last.local-last.cabin)
  const {truth,alert,delay}=record.metrics
  return [
    'At '+last.t+' s, the modeled breathing-zone minus cabin difference was '+gap+' ppm.',
    truth == null ? (alert == null ? 'Neither the modeled zone nor the sensors crossed the demonstration threshold.' : 'A sensor crossed the demonstration threshold without a modeled local crossing.') : alert == null ? 'The modeled zone crossed the demonstration threshold without a sensor alert.' : 'The first sensor crossing differed from the first local crossing by '+delay+' s.',
    'Test whether higher mixing reduces the local–cabin difference by repeating the same duration with ventilation increased and activity held fixed.',
  ]
}
