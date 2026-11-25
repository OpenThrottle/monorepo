/** Lifecycle of one voice-input interaction. */
export const VOICE_PHASE = {
  finalizing: 'finalizing',
  idle: 'idle',
  recording: 'recording',
  starting: 'starting',
} as const;

export type VoicePhaseKey = keyof typeof VOICE_PHASE;
export type VoicePhaseValue = (typeof VOICE_PHASE)[VoicePhaseKey];
