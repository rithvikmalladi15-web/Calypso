import { create } from 'zustand'
import { initial, presets, step, type Point, type Settings } from '../simulation/engine'
import { cabinSensor, type Sensor } from '../simulation/sensorModel'

type State = {
  scenario: string; settings: Settings; points: Point[]; sensors: Sensor[]; running: boolean; masked:boolean; speed: number; noise: number
  tick: () => void; reset: () => void; select: (scenario: keyof typeof presets) => void
}
export const useSim = create<State>((set) => ({
  scenario: 'Routine operations', settings: presets['Routine operations'], points: [initial], sensors: [cabinSensor], running: false, masked:false, speed: 1, noise: 0,
  tick: () => set(state => state.points.length > 3600 ? { running: false } : { points: [...state.points, step(state.points[state.points.length - 1], state.settings)] }),
  reset: () => set({ points: [initial], running: false }),
  select: scenario => set({ scenario, settings: presets[scenario], points: [initial], running: false }),
}))
