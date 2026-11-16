import { useEffect, useState } from 'react'
import type { Settings } from './engine'
import { solveField, type FieldResult } from './fieldModel'

export function useField(settings:Settings) {
  const [completed,setCompleted] = useState<{settings:Settings;result:FieldResult}|null>(null)
  useEffect(()=>{
    let worker:Worker|undefined
    const delay = window.setTimeout(()=>{
      function fallback() { setCompleted({settings,result:solveField(settings)}) }
      if (typeof Worker==='undefined') { fallback(); return }
      try {
        worker = new Worker(new URL('./field.worker.ts',import.meta.url),{type:'module'})
        worker.onmessage = ({data}:MessageEvent<FieldResult>) => setCompleted({settings,result:data})
        worker.onerror = event => { event.preventDefault(); fallback() }
        worker.postMessage(settings)
      } catch { fallback() }
    },100)
    return ()=>{window.clearTimeout(delay);worker?.terminate()}
  },[settings])
  return {result:completed?.result,pending:completed?.settings!==settings}
}
