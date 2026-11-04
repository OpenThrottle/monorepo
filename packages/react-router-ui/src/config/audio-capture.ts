/**
 * @description Sample rate (Hz) of the AudioContext used by `useAudioCapture`;
 * chunks are 16kHz mono Float32 PCM.
 */
export const CAPTURE_SAMPLE_RATE = 16000;

/**
 * @description Default target duration of each PCM chunk emitted by
 * `useAudioCapture` (~4000 samples at 16kHz).
 */
export const DEFAULT_CHUNK_DURATION_MS = 250;

/**
 * @description Registered name of the AudioWorklet processor that batches PCM chunks.
 */
export const WORKLET_PROCESSOR_NAME = 'openthrottle-pcm-chunk';
