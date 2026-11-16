export type Settings = { ventilation: number; scrubber: number; activity: number }
export type Point = { t: number; cabin: number; local: number }
export const version = '1.0'
export const initial: Point = { t: 0, cabin: 650, local: 650 }
export const presets = {
  'Baseline': { ventilation: .65, scrubber: .65, activity: 1 },
  'Best case': { ventilation: 1, scrubber: 1, activity: .6 },
  'Worst case': { ventilation: .08, scrubber: .25, activity: 2.5 },
  'Routine operations': { ventilation: .65, scrubber: .65, activity: 1 },
  'Reduced ventilation': { ventilation: .12, scrubber: .65, activity: 1 },
  'Exercise session': { ventilation: .65, scrubber: .65, activity: 2.5 },
}
export function step(point: Point, settings: Settings, duration = 1): Point {
  if (!Number.isFinite(duration) || duration < 0 || duration > 3600) throw new RangeError('Step duration must be between 0 and 3600 seconds.')
  let { cabin, local } = point
  const count = Math.ceil(duration)
  const dt = count ? duration / count : 0
  for (let i = 0; i < count; i++) {
    // Euler step for Vb·dCb/dt = S − Q(Cb−Cc), Vc·dCc/dt = Q(Cb−Cc) − RCc.
    // Calypso model derivation: research/evidence.md. NASA-STD-3001 §6.2.1.3
    // motivates the ventilation/removal distinction; coefficients are illustrative.
    const exchange = (.006 + .074 * settings.ventilation) * (local - cabin)
    cabin += dt * (exchange - .15 * settings.scrubber * cabin) / 30
    local += dt * (22 * settings.activity - exchange)
  }
  return { t: point.t + duration, cabin, local }
}
export function run(settings: Settings, seconds = 300) {
  const points = [initial]
  for (let i = 0; i < seconds; i++) points.push(step(points[i], settings))
  return points
}
