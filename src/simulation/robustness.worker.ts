import { sweep, type SweepConfig } from './robustness'
self.onmessage = (event:MessageEvent<SweepConfig>) => {
  try { self.postMessage({cells:sweep(event.data)}) }
  catch (error) { self.postMessage({error:error instanceof Error ? error.message : 'Sweep failed'}) }
}
