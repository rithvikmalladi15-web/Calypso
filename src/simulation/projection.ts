import { step, type Point, type Settings } from './engine'
export const interventionOptions: {id:string;label:string;patch:Partial<Settings>}[] = [
  {id:'hold',label:'Keep current settings',patch:{}},
  {id:'mix',label:'Mixing to 90%',patch:{ventilation:.9}},
  {id:'remove',label:'Removal to 90%',patch:{scrubber:.9}},
  {id:'rest',label:'Activity to 0.6×',patch:{activity:.6}},
]
/** Branch from the actual current state, without modifying historical samples. */
export function projectInterventions(point:Point,settings:Settings) {
  const seconds=Math.max(0,Math.min(60,3600-point.t))
  return interventionOptions.map(option=>({...option,seconds,point:step(point,{...settings,...option.patch},seconds)}))
}
