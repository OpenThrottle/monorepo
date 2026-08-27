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

    it('badges only missing rows', () => {
      expect(SKILL_PRESENCE_BADGED).toEqual({
        external: false,
        installed: false,
        missing: true,
      });
    });

    it('links only installed rows, so missing and external never 404', () => {
      expect(SKILL_PRESENCE_LINKABLE).toEqual({
        external: false,
        installed: true,
        missing: false,
      });
    });
  });
});
