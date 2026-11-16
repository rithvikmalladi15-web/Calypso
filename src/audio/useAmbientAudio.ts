import { useEffect, useRef, useState } from 'react'
import { createAmbientEngine } from './ambientEngine'

type AudioOptions = { music: boolean; volume: number; mute: boolean; mood: string; effects: boolean; effectsVolume: number }

export function useAmbientAudio(options: AudioOptions, stress: number) {
  const engine = useRef<ReturnType<typeof createAmbientEngine> | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const latest = useRef(options)
  latest.current = options
  useEffect(() => {
    function unlock() {
      if (engine.current || typeof AudioContext === 'undefined') return
      try {
        engine.current = createAmbientEngine()
        void engine.current.resume().then(()=>setUnlocked(true)).catch(()=>{})
      } catch { /* Audio remains optional on unsupported devices. */ }
    }
    function effect(event: Event) {
      const current = latest.current
      const target = event.target
      if (current.effects && !current.mute && target instanceof Element &&
        target.closest(event.type === 'change' ? 'input,select' : 'button,a,summary')) {
        engine.current?.click(current.effectsVolume, event.type === 'change')
      }
    }
    function visibility() {
      if (!engine.current) return
      if (document.hidden) void engine.current.suspend().catch(()=>{})
      else if (latest.current.music || latest.current.effects) void engine.current.resume().catch(()=>{})
    }
    const events = ['pointerdown','keydown','click'] as const
    events.forEach(name=>window.addEventListener(name,unlock,true))
    window.addEventListener('click',effect)
    window.addEventListener('change',effect)
    document.addEventListener('visibilitychange',visibility)
    return () => {
      events.forEach(name=>window.removeEventListener(name,unlock,true))
      window.removeEventListener('click',effect)
      window.removeEventListener('change',effect)
      document.removeEventListener('visibilitychange',visibility)
      engine.current?.close()
      engine.current = null
    }
  },[])
  const {music,volume,mute,mood} = options
  useEffect(()=>{
    if (unlocked) engine.current?.update(music,volume,mute,mood,stress)
  },[unlocked,music,volume,mute,mood,stress])
}
