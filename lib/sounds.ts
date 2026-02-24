// Web Audio API sound effects — no audio files required

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
}

function beep(frequency: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
  try {
    const ac = ctx()
    if (!ac) return

    const osc = ac.createOscillator()
    const gainNode = ac.createGain()

    osc.connect(gainNode)
    gainNode.connect(ac.destination)

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ac.currentTime)

    gainNode.gain.setValueAtTime(gain, ac.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)

    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + duration)
  } catch {
    // Silently ignore if audio context is unavailable
  }
}

/** Played when adding a service or product line */
export function playScan() {
  beep(1200, 0.08, 'square', 0.2)
}

/** Short success chime */
export function playSuccess() {
  beep(880, 0.06, 'sine', 0.25)
  setTimeout(() => beep(1100, 0.12, 'sine', 0.2), 70)
}

/** Triumphant complete sound */
export function playComplete() {
  beep(660, 0.08, 'sine', 0.3)
  setTimeout(() => beep(880, 0.08, 'sine', 0.25), 90)
  setTimeout(() => beep(1100, 0.18, 'sine', 0.2), 180)
}

/** Error / warning tone */
export function playError() {
  beep(300, 0.15, 'sawtooth', 0.2)
  setTimeout(() => beep(250, 0.2, 'sawtooth', 0.15), 160)
}
