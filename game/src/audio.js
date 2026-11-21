// Night sounds, synthesised live with WebAudio: no audio files, no network.
// Footsteps patter softly, a warden's alarm is a low two-note sting, a petal
// chimes, and clearing a night plays a small rising arpeggio.
export function createAudio() {
  let context = null;
  let muted = false;
  let stepHigh = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, seconds, type, gainValue, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    const start = audio.currentTime + when;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  return {
    unlock() {
      const audio = ensure();
      if (audio && audio.state === 'suspended') void audio.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    footstep() {
      stepHigh = !stepHigh;
      tone(stepHigh ? 190 : 150, 0.07, 'sine', 0.05);
    },
    petal() {
      tone(880, 0.18, 'sine', 0.09);
      tone(1318, 0.25, 'sine', 0.07, 0.08);
    },
    alarm() {
      tone(220, 0.22, 'sawtooth', 0.08);
      tone(174, 0.3, 'sawtooth', 0.08, 0.2);
    },
    caught() {
      tone(110, 0.35, 'triangle', 0.12);
      tone(82, 0.45, 'triangle', 0.1, 0.12);
    },
    win() {
      [523, 659, 784, 1046].forEach((frequency, index) => tone(frequency, 0.3, 'sine', 0.09, index * 0.11));
    },
    click() {
      tone(660, 0.06, 'sine', 0.05);
    },
  };
}
