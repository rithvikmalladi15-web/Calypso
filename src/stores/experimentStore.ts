import { thresholds, type ThresholdId } from '../simulation/thresholds'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { version, type Settings, type Point } from '../simulation/engine'
import { detect, type Sensor } from '../simulation/sensorModel'

export type Experiment = {
  thresholdId?:ThresholdId; id: string; date: string; scenario: string; version: string; settings: Settings; sensors: Sensor[];
  points: Point[]; noise: number; initial: Point; metrics: ReturnType<typeof detect>; sourceIds: string[]; limitations: string
}
export const limitations = 'Two well-mixed compartments with illustrative parameters and constant pressure assumptions. Sensor readings follow discrete zone boundaries. Intended for educational investigation.'
export function snapshot(scenario: string,settings: Settings,sensors: Sensor[],points: Point[],noise: number,thresholdId:ThresholdId = "demo"): Experiment {
  return {thresholdId,id:crypto.randomUUID(),date:new Date().toISOString(),scenario,version,settings,sensors,points,noise,initial:points[0],metrics:detect(points,sensors,noise,thresholds[thresholdId].ppm,thresholds[thresholdId].windowSeconds),sourceIds:['CO2','ENV'],limitations}
}
type Records = { records: Experiment[]; notes: {id: string; date: string; text: string}[]; save: (e: Experiment) => void; remove: (id: string) => void; note: (text: string) => void }
export const useExperiments = create<Records>()(persist(set=>({
  records:[], notes:[],
  save: e=>set(s=>({records:[e,...s.records].slice(0,10)})),
  remove: id=>set(s=>({records:s.records.filter(r=>r.id!==id)})),
  note: text=>set(s=>({notes:[{id:crypto.randomUUID(),date:new Date().toISOString(),text:text.slice(0,500)},...s.notes].slice(0,30)})),
}),{name:'calypso-experiments-v1'}))
