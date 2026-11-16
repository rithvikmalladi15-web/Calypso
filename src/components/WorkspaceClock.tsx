import { useEffect, useState } from 'react'

export function WorkspaceClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return <time className="workspace-clock" dateTime={now.toISOString()}>{now.toISOString().slice(11,19)} UTC</time>
}
