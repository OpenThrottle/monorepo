import { ChatComposerMicState } from '@openthrottle/react-router-chat';

import { VOICE_PHASE } from '~/routing/home/data/data.voice';

type VoicePhase = (typeof VOICE_PHASE)[keyof typeof VOICE_PHASE];

/**
 * @description Maps microphone support and the voice-input phase to the state
 * shown on the toolbar mic control; `starting` reads as recording.
 */
export const resolveMicState = (
  isSupported: boolean,
  phase: VoicePhase,
): ChatComposerMicState => {
  if (!isSupported) {
    return ChatComposerMicState.disabled;
  }
  if (phase === VOICE_PHASE.finalizing) {
    return ChatComposerMicState.finalizing;
  }
  if (phase === VOICE_PHASE.idle) {
    return ChatComposerMicState.idle;
  }
  return ChatComposerMicState.recording;
};
