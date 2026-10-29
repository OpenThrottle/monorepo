/**
 * @description Whether the current environment exposes getUserMedia + AudioWorklet.
 * Hoisted out of `useAudioCapture` per hook-primitive-shape H3.
 */
export const isCaptureSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof AudioContext !== 'undefined' &&
  typeof AudioWorkletNode !== 'undefined';
