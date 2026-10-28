/** Lifecycle of one voice-input interaction. */
export const VOICE_PHASE = {
  finalizing: 'finalizing',
  idle: 'idle',
  recording: 'recording',
  starting: 'starting',
} as const;
