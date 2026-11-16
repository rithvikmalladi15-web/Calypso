import type { Settings } from './engine'

export function readScenario(hash: string): Settings | null {
  const [route, query] = hash.split('?')
  if (route !== '#/simulation' || !query) return null
  const params = new URLSearchParams(query)
  const read = (key: keyof Settings, max: number) => {
    const input = params.get(key)
    if (!input?.trim()) return undefined
    const value = Number(input)
    return Number.isFinite(value) && value >= 0 && value <= max ? value : undefined
  }
  const ventilation = read('ventilation',1)
  const scrubber = read('scrubber',1)
  const activity = read('activity',3)
  return ventilation === undefined || scrubber === undefined || activity === undefined
    ? null : {ventilation,scrubber,activity}
}

export function scenarioUrl(settings: Settings) {
  const url = new URL(location.href)
  url.hash = '/simulation?' + new URLSearchParams({
    ventilation:String(settings.ventilation), scrubber:String(settings.scrubber), activity:String(settings.activity),
  })
  return url.href
}

export function readFieldSensors(hash:string,columns:number,rows:number) {
  const value=new URLSearchParams(hash.split('?')[1]).get('sensors')
  if(value===null)return null
  const locations=value.split(';')
  if(locations.length<1 || locations.length>2)return null
  const sensors=locations.map(location=>{
    if(!/^\d+,\d+$/.test(location))return null
    const [x,y]=location.split(',').map(Number)
    return x<columns && y<rows ? {x,y} : null
  })
  return sensors.every(sensor=>sensor!==null) ? sensors : null
}
