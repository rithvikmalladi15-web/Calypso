import { run, type Settings } from './engine'

self.onmessage = (event: MessageEvent<{settings:Settings;seconds:number}>) => {
  const start = performance.now()
  const points = run(event.data.settings,event.data.seconds)
  self.postMessage({points, milliseconds:performance.now()-start})
}
