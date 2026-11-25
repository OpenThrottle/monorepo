import type { ChatComposerMicStateValue } from '@openthrottle/react-router-chat';
import { CHAT_COMPOSER_MIC_STATE } from '@openthrottle/react-router-chat';

import { VOICE_PHASE } from '~/routing/home/data/voice';

type VoicePhase = (typeof VOICE_PHASE)[keyof typeof VOICE_PHASE];

/**
 * @description Maps microphone support and the voice-input phase to the state
 * shown on the toolbar mic control; `starting` reads as recording.
 */
export const resolveMicState = (
  isSupported: boolean,
  phase: VoicePhase,
): ChatComposerMicStateValue => {
  if (!isSupported) {
    return CHAT_COMPOSER_MIC_STATE.disabled;
  }
  if (phase === VOICE_PHASE.finalizing) {
    return CHAT_COMPOSER_MIC_STATE.finalizing;
  }
  if (phase === VOICE_PHASE.idle) {
    return CHAT_COMPOSER_MIC_STATE.idle;
  }
  return CHAT_COMPOSER_MIC_STATE.recording;
};
