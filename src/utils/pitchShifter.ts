export interface PitchShifterController {
  node: ScriptProcessorNode;
  setSemitones: (semitones: number) => void;
  dispose: () => void;
}

const BUFFER_SIZE = 1024;
const RING_SIZE = 8192;
const RING_MASK = RING_SIZE - 1;
const GRAIN_SIZE = 2048;

/**
 * Creates a stereo dual-head Hann-windowed granular pitch shifter node.
 * Passes audio through bit-identically with zero latency when semitones === 0.
 */
export function createStereoPitchShifter(
  ctx: AudioContext,
  initialSemitones = 0
): PitchShifterController {
  const node = ctx.createScriptProcessor(BUFFER_SIZE, 2, 2);
  const ringL = new Float32Array(RING_SIZE);
  const ringR = new Float32Array(RING_SIZE);

  let writeIdx = 0;
  let phase = 0;
  let targetSemitones = Math.max(-12, Math.min(12, initialSemitones));
  let currentSemitones = targetSemitones;

  const readInterpolated = (ring: Float32Array, pos: number): number => {
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const s0 = ring[i0 & RING_MASK];
    const s1 = ring[(i0 + 1) & RING_MASK];
    return s0 + (s1 - s0) * frac;
  };

  node.onaudioprocess = (event: AudioProcessingEvent) => {
    const inL = event.inputBuffer.getChannelData(0);
    const inR = event.inputBuffer.numberOfChannels > 1 ? event.inputBuffer.getChannelData(1) : inL;
    const outL = event.outputBuffer.getChannelData(0);
    const outR = event.outputBuffer.numberOfChannels > 1 ? event.outputBuffer.getChannelData(1) : outL;
    const len = inL.length;

    // Smoothly approach target semitones to prevent clicks on rapid slider drags
    currentSemitones += (targetSemitones - currentSemitones) * 0.35;
    if (Math.abs(targetSemitones - currentSemitones) < 0.005) {
      currentSemitones = targetSemitones;
    }

    const isBypassed = Math.abs(currentSemitones) < 0.01 && Math.abs(targetSemitones) < 0.01;

    if (isBypassed) {
      // Keep circular buffer warm for click-free transition if pitch shifting engages mid-track
      for (let i = 0; i < len; i++) {
        ringL[writeIdx] = inL[i];
        ringR[writeIdx] = inR[i];
        writeIdx = (writeIdx + 1) & RING_MASK;
      }
      outL.set(inL);
      if (outR !== outL) outR.set(inR);
      return;
    }

    const ratio = Math.pow(2, currentSemitones / 12);
    const phaseInc = (1 - ratio) / GRAIN_SIZE;

    for (let i = 0; i < len; i++) {
      ringL[writeIdx] = inL[i];
      ringR[writeIdx] = inR[i];

      const p1 = phase;
      const p2 = p1 >= 0.5 ? p1 - 0.5 : p1 + 0.5;

      const delay1 = 4 + p1 * GRAIN_SIZE;
      const delay2 = 4 + p2 * GRAIN_SIZE;

      const pos1 = writeIdx - delay1;
      const pos2 = writeIdx - delay2;

      const sinVal = Math.sin(Math.PI * p1);
      const w1 = sinVal * sinVal;
      const w2 = 1 - w1;

      outL[i] = readInterpolated(ringL, pos1) * w1 + readInterpolated(ringL, pos2) * w2;
      if (outR !== outL) {
        outR[i] = readInterpolated(ringR, pos1) * w1 + readInterpolated(ringR, pos2) * w2;
      }

      phase += phaseInc;
      if (phase >= 1) phase -= 1;
      else if (phase < 0) phase += 1;

      writeIdx = (writeIdx + 1) & RING_MASK;
    }
  };

  return {
    node,
    setSemitones: (semitones: number) => {
      targetSemitones = Math.max(-12, Math.min(12, Number.isFinite(semitones) ? semitones : 0));
    },
    dispose: () => {
      node.onaudioprocess = null;
      try {
        node.disconnect();
      } catch {
        // ignore disconnect errors
      }
    }
  };
}
