let _audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    return _audioCtx
  } catch {
    return null
  }
}

export function playShortBeep() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    /* no audio */
  }
}

export function playChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime
    const notes = [
      { freq: 523.25, start: 0, end: 0.4 },
      { freq: 659.25, start: 0.15, end: 0.55 },
      { freq: 783.99, start: 0.3, end: 0.7 },
      { freq: 1046.5, start: 0.45, end: 0.95 },
    ]

    notes.forEach(({ freq, start, end }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + end)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + end)
    })
  } catch {
    /* audio not available */
  }
}
