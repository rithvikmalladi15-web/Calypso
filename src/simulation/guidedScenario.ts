import { presets, run } from './engine'
import { cabinSensor, detect, localSensor } from './sensorModel'

export const guidedScenario = 'Reduced ventilation'
export const guidedSettings = presets[guidedScenario]
export const guidedLocalSensor = {...localSensor,id:cabinSensor.id}
export const guidedPoints = run(guidedSettings)
export const guidedCabinResult = detect(guidedPoints,[cabinSensor])
export const guidedLocalResult = detect(guidedPoints,[guidedLocalSensor])
