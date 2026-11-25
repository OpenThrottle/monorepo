import { CHAT_COMPOSER_MIC_STATE } from '@openthrottle/react-router-chat';
import { describe, expect, it } from 'vitest';

import { VOICE_PHASE } from '~/routing/home/data/data.voice';

import { resolveMicState } from '../resolveMicState';

describe('resolveMicState', () => {
  describe('when capture is unsupported', () => {
    it('is disabled regardless of phase', () => {
      expect(resolveMicState(false, VOICE_PHASE.recording)).toBe(
        CHAT_COMPOSER_MIC_STATE.disabled,
      );
    });
  });

  describe('when capture is supported', () => {
    it('maps finalizing', () => {
      expect(resolveMicState(true, VOICE_PHASE.finalizing)).toBe(
        CHAT_COMPOSER_MIC_STATE.finalizing,
      );
    });

    it('maps idle', () => {
      expect(resolveMicState(true, VOICE_PHASE.idle)).toBe(
        CHAT_COMPOSER_MIC_STATE.idle,
      );
    });

    it('treats recording and starting as recording', () => {
      expect(resolveMicState(true, VOICE_PHASE.recording)).toBe(
        CHAT_COMPOSER_MIC_STATE.recording,
      );
      expect(resolveMicState(true, VOICE_PHASE.starting)).toBe(
        CHAT_COMPOSER_MIC_STATE.recording,
      );
    });
  });
});
