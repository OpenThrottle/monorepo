import { ChatComposerMicState } from '../types';

/**
 * @description The accessible label and tooltip text for the composer mic in
 * each {@link ChatComposerMicState}.
 */
export const getChatComposerMicLabel = (
  micState: ChatComposerMicState,
): string => {
  if (micState === ChatComposerMicState.recording) {
    return 'Stop voice input';
  }

  if (micState === ChatComposerMicState.finalizing) {
    return 'Transcribing…';
  }

  if (micState === ChatComposerMicState.disabled) {
    return 'Voice input unavailable';
  }

  return 'Start voice input';
};
