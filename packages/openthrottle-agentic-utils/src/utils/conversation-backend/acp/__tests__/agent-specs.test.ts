import { describe, expect, it } from 'vitest';

import type { ConversationPermissionMode } from '../../types.ts';
import { ACP_AGENT_SPECS } from '../agent-specs.ts';

describe('ACP_AGENT_SPECS session modes', () => {
  describe('antigravity', () => {
    const spec = ACP_AGENT_SPECS['antigravity'];

    it('asks before edits under supervised and the no-mode default', () => {
      expect(spec?.sessionMode('supervised')).toBe('default');
      expect(spec?.sessionMode(undefined)).toBe('default');
      expect(spec?.asksBeforeEdits).toBe(true);
    });

    it('stops asking for edits under autoAcceptEdits', () => {
      expect(spec?.sessionMode('autoAcceptEdits')).toBe('accept-edits');
    });

    it('runs in auto under fullAccess', () => {
      expect(spec?.sessionMode('fullAccess')).toBe('auto');
    });
  });

  describe('cursor', () => {
    const spec = ACP_AGENT_SPECS['cursor'];

    it('pins agent mode for every posture and reports edits as unasked', () => {
      const postures: ReadonlyArray<ConversationPermissionMode | undefined> = [
        'autoAcceptEdits',
        'fullAccess',
        'supervised',
        undefined,
      ];
      for (const mode of postures) {
        expect(spec?.sessionMode(mode)).toBe('agent');
      }
      expect(spec?.asksBeforeEdits).toBe(false);
    });
  });
});
