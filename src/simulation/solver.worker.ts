import { run, type Settings } from './engine'

self.onmessage = (event: MessageEvent<Settings>) => {
  const start = performance.now()
  const points = run(event.data)
  self.postMessage({points, milliseconds:performance.now()-start})
}
