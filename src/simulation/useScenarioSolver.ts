import { useEffect, useRef, useState } from 'react'
import { run, type Point, type Settings } from './engine'

export function useScenarioSolver(settings:Settings) {
  const worker = useRef<Worker|null>(null)
  const [pending,setPending] = useState(false)
  const [milliseconds,setMilliseconds] = useState<number|null>(null)
  useEffect(()=>{
    setPending(false)
    setMilliseconds(null)
    return ()=>{
      worker.current?.terminate()
      worker.current = null
    }
  },[settings])

  function solve(complete:(points:Point[])=>void) {
    function finish(points:Point[], elapsed:number) {
      worker.current?.terminate()
      worker.current = null
      setMilliseconds(elapsed)
      setPending(false)
      complete(points)
    }
    function inline() {
      const start = performance.now()
      const points = run(settings)
      finish(points,performance.now()-start)
    }
    if (typeof Worker === 'undefined') { inline(); return }
    try {
      const task = new Worker(new URL('./solver.worker.ts',import.meta.url),{type:'module'})
      worker.current = task
      setPending(true)
      task.onmessage = (event:MessageEvent<{points:Point[];milliseconds:number}>)=>{
        if(worker.current === task) finish(event.data.points,event.data.milliseconds)
      }
      task.onerror = event=>{
        event.preventDefault()
        if(worker.current === task) inline()
      }
      task.postMessage(settings)
    } catch { inline() }
  }
  return {solve,pending,milliseconds}
}
