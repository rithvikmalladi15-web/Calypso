import { useRef, useState } from 'react'

export function SimulationMusic() {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)

  async function toggle() {
    const track = audio.current
    if (!track) return
    if (!track.paused) {
      track.pause()
      return
    }
    setError(false)
    track.volume = 0.35
    try {
      await track.play()
    } catch {
      setError(true)
    }
  }

  return <div className="simulation-music">
    <audio ref={audio} src="/audio/cabin-ambient.wav" loop preload="none"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <button type="button" aria-pressed={playing} onClick={() => void toggle()}>Ambient music</button>
    {error && <span role="status">Music could not play.</span>}
  </div>
}
