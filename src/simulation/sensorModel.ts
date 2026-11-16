import { averaged } from './thresholds'
import type { Point } from './engine'
export type Sensor = { id: string; x: number; y: number }
export const zone = { x: .53, y: .37, radius: .17 }
export const cabinSensor: Sensor = { id: 'S1', x: .19, y: .28 }
export const localSensor: Sensor = { id: 'S2', x: .6, y: .34 }
export const isLocal = (s: Sensor) => Math.hypot(s.x - zone.x, s.y - zone.y) <= zone.radius
export function reading(p: Point, s: Sensor, noise = 0) {
  return Math.max(0, (isLocal(s) ? p.local : p.cabin) + noise * Math.sin(p.t * 2.37 + s.id.charCodeAt(s.id.length - 1)))
}
export const threshold = 1250
export function detect(points: Point[], sensors: Sensor[], noise = 0, limit = threshold, windowSeconds = 0) {
  const local = averaged(points,points.map(p=>p.local),windowSeconds)
  const traces = sensors.map(sensor=>averaged(points,points.map(p=>reading(p,sensor,noise)),windowSeconds))
  const truth = points.find((_,i)=>local[i]!=null && local[i]! >= limit)?.t
  const alert = points.find((_,i)=>traces.some(trace=>trace[i]!=null && trace[i]! >= limit))?.t
  const meanError = points.reduce((sum, p) => sum + Math.abs(p.local - Math.max(...sensors.map(s => reading(p, s, noise)))), 0) / points.length
  return { truth, alert, meanError, delay: truth != null && alert != null ? alert - truth : null }
}
