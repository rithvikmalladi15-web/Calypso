import { initial, step, type Point, type Settings } from './engine'
export type SupportSettings={oxygenTarget:number}
export const defaultSupport:SupportSettings={oxygenTarget:20.9}
export type Intervention={t:number;label:string;settings:Settings;support:SupportSettings}
export type RunPlan={initialSettings:Settings;initialSupport:SupportSettings;interventions:Intervention[];support:SupportSettings}
export const oxygenAssumptions={initialPercent:20.9,responseSeconds:120,volumeM3:31,respiratoryQuotient:.92}
export function oxygenStep(oxygen:number,activity:number,target:number,seconds=1){
  // Independent, illustrative cabin-O2 channel, not blood saturation or a full gas balance.
  const uptake=22*activity/(oxygenAssumptions.respiratoryQuotient*oxygenAssumptions.volumeM3*10000)
  const equilibrium=target-uptake*oxygenAssumptions.responseSeconds
  return equilibrium+(oxygen-equilibrium)*Math.exp(-seconds/oxygenAssumptions.responseSeconds)
}
export function supportTimeline(points:Point[],plan:RunPlan){
  let oxygen=oxygenAssumptions.initialPercent,settings=plan.initialSettings,support=plan.initialSupport,index=0
  return points.map((point,i)=>{
    const previous=points[i-1]
    if(previous){
      while(index<plan.interventions.length&&plan.interventions[index].t<=previous.t){const event=plan.interventions[index++];settings=event.settings;support=event.support}
      oxygen=oxygenStep(oxygen,settings.activity,support.oxygenTarget,point.t-previous.t)
    }
    return {t:point.t,oxygen,oxygenTarget:support.oxygenTarget,activity:settings.activity}
  })
}
export function replayPlan(plan:RunPlan,seconds:number){
  const points=[initial];let settings=plan.initialSettings,index=0
  for(let t=0;t<seconds;t++){
    while(index<plan.interventions.length&&plan.interventions[index].t<=t)settings=plan.interventions[index++].settings
    points.push(step(points[points.length-1],settings))
  }
  return points
}
export function timeAboveReference(points:Point[],limit:number){
  return points.slice(1).reduce((sum,p,i)=>{
    const before=points[i],dt=p.t-before.t
    if(before.local>=limit&&p.local>=limit)return sum+dt
    if(before.local<limit&&p.local<limit)return sum
    return sum+dt*(Math.max(before.local,p.local)-limit)/Math.abs(p.local-before.local)
  },0)
}
