import type { ChatComposerMicStateValue } from '../types';
import { CHAT_COMPOSER_MIC_STATE } from '../types';

/**
 * @description The accessible label and tooltip text for the composer mic in
 * each {@link CHAT_COMPOSER_MIC_STATE}.
 */
export const getChatComposerMicLabel = (
  micState: ChatComposerMicStateValue,
): string => {
  if (micState === CHAT_COMPOSER_MIC_STATE.recording) {
    return 'Stop voice input';
  }

  if (micState === CHAT_COMPOSER_MIC_STATE.finalizing) {
    return 'Transcribing…';
  }

  if (micState === CHAT_COMPOSER_MIC_STATE.disabled) {
    return 'Voice input unavailable';
  }

  return 'Start voice input';
};
