import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'
import { useAmbientAudio } from '../audio/useAmbientAudio'
import { useSim } from '../stores/simulationStore'

const key = 'calypso.preferences'
const choices = {
  mood:['Calm ocean','Deep space','Forest dawn','Auto'],
  animation:['Slow','Normal','Fast'], theme:['Light','Dark','System'],
  units:['Metric','Imperial'], quality:['Low','Medium','High'],
}
const defaults = () => ({
  music:false, volume:.35, mute:false, mood:'Auto', effects:false, effectsVolume:.35,
  animation:'Normal', reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
  grid:true, theme:'Dark', units:'Metric', quality:'Medium', dismissed:false, onboarding:false,
})
type Preferences = ReturnType<typeof defaults>
function restore(): Preferences {
  const fallback = defaults()
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (stored?.version !== 1) return fallback
    for (const field of Object.keys(fallback) as (keyof Preferences)[]) {
      const value: unknown = stored.values?.[field]
      if (typeof value === 'string' && !choices[field as keyof typeof choices]?.includes(value)) continue
      if (typeof value === typeof fallback[field] && (typeof value !== 'number' || (value >= 0 && value <= 1))) {
        Object.assign(fallback, {[field]:value})
      }
    }
  } catch { /* Defaults also work when storage is disabled. */ }
  return fallback
}
const SettingsContext = createContext<{preferences:Preferences; update:(patch:Partial<Preferences>)=>void; reset:()=>void; setFieldStress:(value:number|null)=>void} | null>(null)
export function SettingsProvider({children}:{children:ReactNode}) {
  const [preferences,setPreferences] = useState(restore)
  const [fieldStress,setFieldStress] = useState<number|null>(null)
  const stress = useSim(state=>Math.round((1-state.settings.ventilation)*10)/10)
  useAmbientAudio(preferences,fieldStress ?? stress)
  useLayoutEffect(()=>{
    try { localStorage.setItem(key,JSON.stringify({version:1,values:preferences})) } catch { /* Storage is optional. */ }
    const root = document.documentElement
    root.dataset.theme = preferences.theme.toLowerCase()
    root.dataset.motion = preferences.reducedMotion ? 'reduced' : 'normal'
    root.dataset.grid = String(preferences.grid)
    root.dataset.quality = preferences.quality.toLowerCase()
    root.dataset.animation = preferences.animation.toLowerCase()
  },[preferences])
  return <SettingsContext.Provider value={{preferences,update:patch=>setPreferences(previous=>({...previous,...patch})),reset:()=>setPreferences(defaults()),setFieldStress}}>{children}</SettingsContext.Provider>
}
export function usePreferences() {
  const context = useContext(SettingsContext)
  return context
}
