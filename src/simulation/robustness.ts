import { run } from './engine'
import { cabinSensor, localSensor, detect, threshold } from './sensorModel'
export type SweepConfig = { ventilation: number[]; activity: number[]; scrubber: number; seconds: number; threshold: number }
export const defaultSweep: SweepConfig = {ventilation:[0,.2,.4,.6,.8,1],activity:[0,.6,1.2,1.8,2.4,3],scrubber:.65,seconds:300,threshold}
export type SweepCell = {ventilation:number;activity:number;crossing?:number;cabin?:number;local?:number;cabinDelay:number|null;localDelay:number|null}
export function sweep(config:SweepConfig):SweepCell[] {
  if (!config.ventilation.length || !config.activity.length || config.ventilation.length*config.activity.length>400 || !Number.isInteger(config.seconds) || config.seconds<1 || config.seconds>3600 || config.scrubber<0 || config.scrubber>1 || !Number.isFinite(config.threshold) || config.threshold<=0 || config.ventilation.some(v=>!Number.isFinite(v)||v<0||v>1) || config.activity.some(a=>!Number.isFinite(a)||a<0||a>3)) throw new Error('Invalid sweep settings')
  return config.activity.flatMap(activity=>config.ventilation.map(ventilation=>{
    const points=run({activity,ventilation,scrubber:config.scrubber},config.seconds)
    const cabin=detect(points,[cabinSensor],0,config.threshold), local=detect(points,[localSensor],0,config.threshold)
    return {activity,ventilation,crossing:cabin.truth,cabin:cabin.alert,local:local.alert,cabinDelay:cabin.delay,localDelay:local.delay}
  }))
}
export function sweepCsv(config:SweepConfig,cells:SweepCell[]) {
  const status=(cell:SweepCell,sensor:'cabin'|'local')=>cell.crossing==null?'no local crossing':cell[sensor]==null?'never detected':'detected'
  return ['ventilation_fraction,activity_multiplier,removal_fraction,duration_s,threshold_ppm,local_crossing_s,cabin_detection_s,local_detection_s,cabin_delay_s,local_delay_s,cabin_status,local_status',...cells.map(c=>[c.ventilation,c.activity,config.scrubber,config.seconds,config.threshold,c.crossing??'',c.cabin??'',c.local??'',c.cabinDelay??'',c.localDelay??'',status(c,'cabin'),status(c,'local')].join(','))].join('\n')
}
