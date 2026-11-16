import { solveField } from './fieldModel'
import type { Settings } from './engine'

self.onmessage = ({data}:MessageEvent<Settings>) => {
  const result = solveField(data)
  self.postMessage(result,{transfer:[...result.frames.map(frame=>frame.buffer),result.firstCrossing.buffer]})
}
