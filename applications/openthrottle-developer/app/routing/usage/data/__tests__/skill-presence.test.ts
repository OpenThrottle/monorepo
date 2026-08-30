import { describe, expect, it } from 'vitest';
import {
  SKILL_PRESENCE,
  SKILL_PRESENCES,
  SKILL_PRESENCE_BADGED,
  SKILL_PRESENCE_LABELS,
  SKILL_PRESENCE_LINKABLE,
  SKILL_PRESENCE_TOOLTIPS,
  classifySkillUsagePresence,
} from '~/routing/usage/data/skill-presence';
import { SKILL_RECORD_TAGS_COPY } from '~/routing/skills/data/data.copy';
import { SKILL_USAGE_SCOPES } from '~/routing/usage/data/skill-usage-copy';

describe('skill-presence', () => {
  describe('classifySkillUsagePresence', () => {
    it('classifies an ours-scope row with a matching disk slug as installed', () => {
      const presence = classifySkillUsagePresence(
        { scope: SKILL_USAGE_SCOPES.OURS, skillName: 'ot-plans' },
        new Set(['ot-plans', 'ot-stack']),
      );

      expect(presence).toBe(SKILL_PRESENCE.INSTALLED);
    });

    it('classifies an ours-scope row with no disk slug as missing', () => {
      const presence = classifySkillUsagePresence(
        { scope: SKILL_USAGE_SCOPES.OURS, skillName: 'renamed-away' },
        new Set(['ot-plans']),
      );

      expect(presence).toBe(SKILL_PRESENCE.MISSING);
    });

    it('classifies a third-party row as external when no disk slug matches', () => {
      const presence = classifySkillUsagePresence(
        { scope: SKILL_USAGE_SCOPES.THIRD_PARTY, skillName: 'vercel:deploy' },
        new Set(['ot-plans']),
      );

      expect(presence).toBe(SKILL_PRESENCE.EXTERNAL);
    });

    it('classifies a third-party row as external even when its name DOES coincidentally match a disk slug', () => {
      const presence = classifySkillUsagePresence(
        { scope: SKILL_USAGE_SCOPES.THIRD_PARTY, skillName: 'ot-plans' },
        new Set(['ot-plans']),
      );

      expect(presence).toBe(SKILL_PRESENCE.EXTERNAL);
    });

    it('classifies an ours-scope row as missing when no slugs are present at all', () => {
      const presence = classifySkillUsagePresence(
        { scope: SKILL_USAGE_SCOPES.OURS, skillName: 'ot-plans' },
        new Set(),
      );

      expect(presence).toBe(SKILL_PRESENCE.MISSING);
    });
  });

  describe('derived maps', () => {
    it('covers every member in each map', () => {
      for (const member of SKILL_PRESENCES) {
        expect(SKILL_PRESENCE_LABELS[member]).toBeTruthy();
        expect(SKILL_PRESENCE_TOOLTIPS[member]).toBeTruthy();
        expect(typeof SKILL_PRESENCE_BADGED[member]).toBe('boolean');
        expect(typeof SKILL_PRESENCE_LINKABLE[member]).toBe('boolean');
      }
    });

    it('reuses the SkillsTable orphan wording for missing so the two surfaces agree', () => {
      expect(SKILL_PRESENCE_LABELS.missing).toBe(
        SKILL_RECORD_TAGS_COPY.orphanBadge,
      );
    });

    it('badges the two rows that need explaining, and no others', () => {
      expect(SKILL_PRESENCE_BADGED).toEqual({
        external: false,
        installed: false,
        missing: true,
        personal: true,
      });
    });

    it('links only rows that resolve on disk, so nothing 404s', () => {
      expect(SKILL_PRESENCE_LINKABLE).toEqual({
        external: false,
        installed: true,
        missing: false,
        personal: true,
      });
    });

    it('classifies an on-disk personal skill as personal, not installed', () => {
      const presence = classifySkillUsagePresence(
        { scope: 'ours', skillName: 'my-draft' },
        new Set(['my-draft']),
        new Set(['my-draft']),
      );

      expect(presence).toBe('personal');
    });

    // Present-but-not-shared is neither of the two states it could be mistaken
    // for: it is right there on disk, and it is yours, not a third party's.
    it('never reads a personal skill as missing or as third-party', () => {
      const presence = classifySkillUsagePresence(
        { scope: 'ours', skillName: 'my-draft' },
        new Set(['my-draft']),
        new Set(['my-draft']),
      );

      expect(presence).not.toBe('missing');
      expect(presence).not.toBe('external');
    });

    it('falls back to installed when the caller has no personal set', () => {
      const presence = classifySkillUsagePresence(
        { scope: 'ours', skillName: 'my-draft' },
        new Set(['my-draft']),
      );

      expect(presence).toBe('installed');
    });
  });
});
