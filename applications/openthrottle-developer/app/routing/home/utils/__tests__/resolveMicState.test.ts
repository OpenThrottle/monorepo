import { ChatComposerMicState } from '@openthrottle/react-router-chat';
import { describe, expect, it } from 'vitest';

import { VOICE_PHASE } from '~/routing/home/data/data.voice';

import { resolveMicState } from '../resolveMicState';

describe('resolveMicState', () => {
  describe('when capture is unsupported', () => {
    it('is disabled regardless of phase', () => {
      expect(resolveMicState(false, VOICE_PHASE.recording)).toBe(
        ChatComposerMicState.disabled,
      );
    });
  });

  describe('when capture is supported', () => {
    it('maps finalizing', () => {
      expect(resolveMicState(true, VOICE_PHASE.finalizing)).toBe(
        ChatComposerMicState.finalizing,
      );
    });

    it('maps idle', () => {
      expect(resolveMicState(true, VOICE_PHASE.idle)).toBe(
        ChatComposerMicState.idle,
      );
    });

    it('treats recording and starting as recording', () => {
      expect(resolveMicState(true, VOICE_PHASE.recording)).toBe(
        ChatComposerMicState.recording,
      );
      expect(resolveMicState(true, VOICE_PHASE.starting)).toBe(
        ChatComposerMicState.recording,
      );
    });
  });
});
