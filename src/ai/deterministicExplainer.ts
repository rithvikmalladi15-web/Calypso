import type { Experiment } from '../stores/experimentStore'
export function explain(record: Experiment) {
  const last = record.points[record.points.length-1]
  const gap = Math.round(last.local-last.cabin)
  const {truth,alert,delay}=record.metrics
  return [
    'At '+last.t+' s, the modeled breathing-zone minus cabin difference was '+gap+' ppm.',
    record.thresholdId === 'nasa' && last.t-record.initial.t < 3600 ? 'Insufficient duration for the NASA one-hour average reference.' : truth == null ? (alert == null ? 'Neither the modeled zone nor the sensors crossed the saved threshold reference.' : 'A sensor crossed the saved threshold reference without a modeled local crossing.') : alert == null ? 'The modeled zone crossed the saved threshold reference without a sensor alert.' : 'The first sensor crossing differed from the first local crossing by '+delay+' s.',
    'Test whether higher mixing reduces the local–cabin difference by repeating the same duration with ventilation increased and activity held fixed.',
  ]
}
