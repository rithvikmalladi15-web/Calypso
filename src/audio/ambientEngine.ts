export function createAmbientEngine() {
  const context = new AudioContext()
  const master = context.createGain()
  const pad = context.createGain()
  const effects = context.createGain()
  const filter = context.createBiquadFilter()
  const reverb = context.createConvolver()
  master.gain.value = 0
  pad.gain.value = 0
  filter.frequency.value = 600
  const impulse = context.createBuffer(2, context.sampleRate * 3, context.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const samples = impulse.getChannelData(channel)
    samples.forEach((_, i) => { samples[i] = (Math.random()*2-1) * (1-i/samples.length)**3 })
  }
  reverb.buffer = impulse
  filter.connect(pad)
  pad.connect(master)
  pad.connect(reverb)
  reverb.connect(master)
  effects.connect(master)
  master.connect(context.destination)
  const voices = [1, 1.5, 2].map((ratio, index) => {
    const voice = context.createOscillator()
    const level = context.createGain()
    voice.type = index === 1 ? 'triangle' : 'sine'
    voice.frequency.value = 110 * ratio
    voice.detune.value = index * 3 - 3
    level.gain.value = .045
    voice.connect(level).connect(filter)
    voice.start()
    return voice
  })
  const noise = context.createBufferSource()
  noise.buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate)
  const samples = noise.buffer.getChannelData(0)
  samples.forEach((_, i) => { samples[i] = Math.random()*2-1 })
  noise.loop = true
  const ocean = context.createBiquadFilter()
  ocean.frequency.value = 300
  const swell = context.createGain()
  swell.gain.value = .035
  const lfo = context.createOscillator()
  const depth = context.createGain()
  depth.gain.value = .02
  lfo.frequency.value = .11
  lfo.connect(depth).connect(swell.gain)
  noise.connect(ocean).connect(swell).connect(filter)
  noise.start()
  lfo.start()
  let music = false
  let currentVolume = 0
  let root = 110
  function tone(frequency: number, duration: number, volume: number, destination: AudioNode) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now+.035)
    gain.gain.exponentialRampToValueAtTime(.0001, now+duration)
    oscillator.connect(gain).connect(destination)
    oscillator.start()
    oscillator.stop(now+duration)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }
  let bell: ReturnType<typeof setTimeout>
  function scheduleBell() {
    bell = setTimeout(() => {
      if (music && context.state === 'running') {
        const scale = [1, 9/8, 5/4, 3/2, 5/3]
        tone(root * 4 * scale[Math.floor(Math.random()*scale.length)], 2.4, .045, filter)
      }
      scheduleBell()
    }, 9000+Math.random()*15000)
  }
  scheduleBell()
  return {
    resume: () => context.resume(),
    suspend: () => context.suspend(),
    update(enabled: boolean, volume: number, muted: boolean, mood: string, stress: number) {
      const now = context.currentTime
      music = enabled
      master.gain.setValueAtTime(muted ? 0 : 1, now)
      const nextVolume = enabled ? volume : 0
      if (nextVolume !== currentVolume) {
        pad.gain.cancelAndHoldAtTime(now)
        pad.gain.linearRampToValueAtTime(nextVolume, now + (enabled ? 3 : 1.5))
        currentVolume = nextVolume
      }
      root = mood === 'Deep space' ? 82 : mood === 'Forest dawn' ? 147 : mood === 'Auto' ? 131-49*stress : 110
      filter.frequency.setTargetAtTime(mood === 'Auto' ? 900-560*stress : mood === 'Forest dawn' ? 1050 : 560, now, 2.5)
      voices.forEach((voice, i) => voice.frequency.setTargetAtTime(root * [1, mood === 'Auto' ? 1.5-.067*stress : 1.5, 2][i], now, 2.5))
    },
    click(volume: number, change = false) { if (volume > 0 && context.state === 'running') tone(change ? 440 : 520, .12, .07*volume, effects) },
    close() { clearTimeout(bell); void context.close() },
  }
}
