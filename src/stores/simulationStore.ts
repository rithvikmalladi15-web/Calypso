import { defaultSupport, type SupportSettings, type Intervention } from '../simulation/lifeSupport'
import type { ThresholdId } from '../simulation/thresholds'
import { create } from 'zustand'
import { initial, presets, step, type Point, type Settings } from '../simulation/engine'
import { cabinSensor, type Sensor } from '../simulation/sensorModel'

type State = {
  initialSettings:Settings; initialSupport:SupportSettings; support:SupportSettings; interventions:Intervention[];
  intervene:(label:string,settings?:Partial<Settings>,support?:Partial<SupportSettings>)=>void; advance:(seconds:number)=>void;
  thresholdId: ThresholdId; scenario: string; settings: Settings; points: Point[]; sensors: Sensor[]; running: boolean; masked:boolean; speed: number; noise: number
  tick: () => void; reset: () => void; select: (scenario: keyof typeof presets) => void
}
export const useSim = create<State>((set) => ({
  initialSettings:presets['Routine operations'],initialSupport:defaultSupport,support:defaultSupport,interventions:[],
  intervene:(label,patch={},supportPatch={})=>set(state=>{
    const settings={...state.settings,...patch},support={...state.support,...supportPatch}
    if(!Number.isFinite(settings.ventilation)||settings.ventilation<0||settings.ventilation>1||!Number.isFinite(settings.scrubber)||settings.scrubber<0||settings.scrubber>1||!Number.isFinite(settings.activity)||settings.activity<0||settings.activity>3||!Number.isFinite(support.oxygenTarget)||support.oxygenTarget<18||support.oxygenTarget>23)return state
    const t=state.points.at(-1)!.t
    if(t>=3600||state.interventions.length>=100)return state
    return {settings,support,interventions:[...state.interventions,{t,label:label.slice(0,100),settings,support}]}
  }),
  advance:seconds=>set(state=>{
    if(!Number.isInteger(seconds)||seconds<1||seconds>3600)return state
    const points=[...state.points]
    for(let i=0;i<seconds&&points.at(-1)!.t<3600;i++)points.push(step(points.at(-1)!,state.settings))
    return {points,running:false}
  }),
  thresholdId:'demo', scenario: 'Routine operations', settings: presets['Routine operations'], points: [initial], sensors: [cabinSensor], running: false, masked:false, speed: 1, noise: 0,
  tick: () => set(state => state.points.length > 3600 ? { running: false } : { points: [...state.points, step(state.points[state.points.length - 1], state.settings)] }),
  reset: () => set(state=>({ points: [initial], running: false,initialSettings:state.settings,initialSupport:state.support,interventions:[] })),
  select: scenario => set({ scenario, settings: presets[scenario],initialSettings:presets[scenario],initialSupport:defaultSupport,support:defaultSupport,interventions:[], points: [initial], running: false }),
}))
