import { describe, expect, test } from 'vitest';
import { SKILLS_SOURCE_COPY } from '~/routing/skills/data/data.copy';
import { getSkillSourceBadge } from '~/routing/skills/utils/source-badge';

describe('getSkillSourceBadge', () => {
  test('openthrottle → accent OpenThrottle, never linked', () => {
    const badge = getSkillSourceBadge({ source: 'openthrottle' });

    expect(badge.color).toBe('accent');
    expect(badge.href).toBeUndefined();
    expect(badge.kind).toBe('openthrottle');
    expect(badge.label).toBe(SKILLS_SOURCE_COPY.openthrottleLabel);
    expect(badge.tooltip).toBe(SKILLS_SOURCE_COPY.openthrottleTooltip);
  });

  test('external without a URL → yellow External, generic tooltip', () => {
    const badge = getSkillSourceBadge({ source: 'external' });

    expect(badge.color).toBe('yellow');
    expect(badge.href).toBeUndefined();
    expect(badge.kind).toBe('external');
    expect(badge.label).toBe(SKILLS_SOURCE_COPY.externalLabel);
    expect(badge.tooltip).toBe(SKILLS_SOURCE_COPY.externalTooltip);
  });

  test('external with a URL → yellow External, href and URL tooltip', () => {
    const badge = getSkillSourceBadge({
      source: 'external',
      sourceUrl: 'https://example.com/skill',
    });

    expect(badge.color).toBe('yellow');
    expect(badge.href).toBe('https://example.com/skill');
    expect(badge.kind).toBe('external');
    expect(badge.label).toBe(SKILLS_SOURCE_COPY.externalLabel);
    expect(badge.tooltip).toBe(
      `${SKILLS_SOURCE_COPY.externalUrlTooltipPrefix} https://example.com/skill`,
    );
  });

  test('personal outranks source and never links, even with a sourceUrl', () => {
    const badge = getSkillSourceBadge({
      isPersonal: true,
      source: 'external',
      sourceUrl: 'https://example.com/skill',
    });

    expect(badge.color).toBe('green');
    expect(badge.href).toBeUndefined();
    expect(badge.kind).toBe('personal');
    expect(badge.label).toBe(SKILLS_SOURCE_COPY.personalLabel);
    expect(badge.tooltip).toBe(SKILLS_SOURCE_COPY.personalTooltip);
  });
});
