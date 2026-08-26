/**
 * @description A deliberately broken fixture per rule.
 *
 * A validator is only worth having if each rule has been seen to fail. Asserting
 * that the real season passes proves almost nothing — it passed before any of
 * these rules existed.
 */

import { describe, expect, test } from 'vitest';

import { isBlocking, validateEpisode, validateSeason } from '../rules';
import type { VideoEpisode } from '../../episodes/types';

const base: VideoEpisode = {
  beats: [
    { action: 'Terminal.', t: '0:00' },
    { action: 'Browser.', t: '0:30' },
  ],
  format: 'short',
  id: 'fixture',
  production: { blockedOn: [], recording: 'live', titleCard: ['One', 'Two'] },
  release: { order: 1, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'A short line.'],
        ['0:30', 'Another short line.'],
      ],
    },
  ],
  youtube: {
    summary: 'A fixture.',
    tags: [
      'ai agents',
      'coding agents',
      'developer tools',
      'mcp',
      'open source',
      'openthrottle',
    ],
    title: 'Your first plan in 60 seconds',
  },
};

const rulesFired = (episode: VideoEpisode): readonly string[] =>
  validateEpisode(episode).map((finding) => finding.rule);

describe('a well-formed episode', () => {
  test('fires no rules at all', () => {
    expect(validateEpisode(base)).toEqual([]);
  });
});

describe('structural rules (error — fail on any episode)', () => {
  test('beat times must be mm:ss', () => {
    const broken: VideoEpisode = {
      ...base,
      beats: [{ action: 'Terminal.', t: 'later' }],
    };

    expect(rulesFired(broken)).toContain('beat-format');
  });

  test('the first beat must be at zero', () => {
    const broken: VideoEpisode = {
      ...base,
      beats: [{ action: 'Terminal.', t: '0:04' }],
    };

    expect(rulesFired(broken)).toContain('beat-start');
  });

  test('00:00 is accepted as the start — long-form writes it zero-padded', () => {
    const padded: VideoEpisode = {
      ...base,
      beats: [{ action: 'Terminal.', t: '00:00' }],
      variants: [{ id: 'only', narration: [['00:00', 'Words.']] }],
    };

    expect(rulesFired(padded)).not.toContain('beat-start');
  });

  test('beat times must move forward', () => {
    const broken: VideoEpisode = {
      ...base,
      beats: [
        { action: 'A.', t: '0:00' },
        { action: 'B.', t: '0:30' },
        { action: 'C.', t: '0:20' },
      ],
    };

    expect(rulesFired(broken)).toContain('beat-order');
  });

  test('a beat needs an action', () => {
    const broken: VideoEpisode = {
      ...base,
      beats: [{ action: '   ', t: '0:00' }],
    };

    expect(rulesFired(broken)).toContain('beat-action');
  });

  test('selectedVariant must name a variant', () => {
    expect(rulesFired({ ...base, selectedVariant: 'ghost' })).toContain(
      'selected-variant',
    );
  });

  test('narration over budget fails', () => {
    const words = Array.from({ length: 200 }, () => 'word').join(' ');
    const broken: VideoEpisode = {
      ...base,
      variants: [{ id: 'only', narration: [['0:00', words]] }],
    };

    expect(rulesFired(broken)).toContain('word-budget');
  });

  test('the budget has the documented five-word tolerance', () => {
    // 132 + 5 passes; 132 + 6 does not.
    const atTolerance = Array.from({ length: 137 }, () => 'word').join(' ');
    const overIt = Array.from({ length: 138 }, () => 'word').join(' ');

    expect(
      rulesFired({
        ...base,
        variants: [{ id: 'only', narration: [['0:00', atTolerance]] }],
      }),
    ).not.toContain('word-budget');
    expect(
      rulesFired({
        ...base,
        variants: [{ id: 'only', narration: [['0:00', overIt]] }],
      }),
    ).toContain('word-budget');
  });

  test('every variant is checked, not only the one that ships', () => {
    const words = Array.from({ length: 200 }, () => 'word').join(' ');
    const broken: VideoEpisode = {
      ...base,
      variants: [
        {
          id: 'only',
          narration: [['0:00', 'Fine.']],
          thesis: 'the shipping one',
        },
        { id: 'other', narration: [['0:00', words]], thesis: 'the long one' },
      ],
    };
    const finding = validateEpisode(broken).find(
      (candidate) => candidate.rule === 'word-budget',
    );

    expect(finding?.variantId).toBe('other');
  });

  test('several variants each need a thesis', () => {
    const broken: VideoEpisode = {
      ...base,
      variants: [
        { id: 'only', narration: [['0:00', 'Fine.']] },
        { id: 'other', narration: [['0:00', 'Also fine.']] },
      ],
    };

    expect(rulesFired(broken)).toContain('variant-thesis');
  });

  test('a lone variant does not need one', () => {
    expect(rulesFired(base)).not.toContain('variant-thesis');
  });

  test('narration cues may not run backwards', () => {
    const broken: VideoEpisode = {
      ...base,
      variants: [
        {
          id: 'only',
          narration: [
            ['0:30', 'Later.'],
            ['0:00', 'Earlier.'],
          ],
        },
      ],
    };

    expect(rulesFired(broken)).toContain('cue-order');
  });

  test('a short may not carry chapters', () => {
    const broken: VideoEpisode = {
      ...base,
      youtube: {
        ...base.youtube,
        chapters: [{ label: 'Intro', t: '00:00' }],
      },
    };

    expect(rulesFired(broken)).toContain('chapters');
  });

  test('a long-form chapter list must start at 00:00', () => {
    const broken: VideoEpisode = {
      ...base,
      format: 'longform',
      youtube: {
        ...base.youtube,
        chapters: [{ label: 'Intro', t: '00:12' }],
      },
    };

    expect(rulesFired(broken)).toContain('chapters');
  });

  test('a short may not carry a designed thumbnail', () => {
    const broken: VideoEpisode = {
      ...base,
      youtube: { ...base.youtube, thumbnail: { words: ['One'] } },
    };

    expect(rulesFired(broken)).toContain('thumbnail');
  });

  test('a thumbnail may not exceed four words', () => {
    const broken: VideoEpisode = {
      ...base,
      format: 'longform',
      youtube: {
        ...base.youtube,
        chapters: [{ label: 'Intro', t: '00:00' }],
        thumbnail: { words: ['One', 'Two', 'Three', 'Four', 'Five'] },
      },
    };

    expect(rulesFired(broken)).toContain('thumbnail');
  });

  test('an unknown playlist fails', () => {
    // Round-tripped through JSON so the invalid value enters without a type
    // assertion. That is also the honest shape of the risk: the compiler already
    // stops a bad playlist written in a module, so the rule earns its keep only
    // against a value that arrived from outside the type system.
    const parsed: VideoEpisode = JSON.parse(
      JSON.stringify({
        ...base,
        release: { ...base.release, playlist: 'misc' },
      }),
    );

    expect(rulesFired(parsed)).toContain('playlist');
  });

  test('a blocked episode may not be marked ready', () => {
    const broken: VideoEpisode = {
      ...base,
      production: {
        ...base.production,
        blockedOn: ['a feature that does not exist'],
      },
      release: { ...base.release, status: 'ready' },
    };

    expect(rulesFired(broken)).toContain('publish-gate');
  });

  test('two episodes may not claim one release slot', () => {
    const findings = validateSeason([base, { ...base, id: 'other' }]);

    expect(findings.map((finding) => finding.rule)).toContain('release-order');
  });
});

describe('convention rules (publish — advisory on a draft)', () => {
  const missingTags: VideoEpisode = {
    ...base,
    youtube: { ...base.youtube, tags: ['openthrottle', 'mcp'] },
  };

  test('a missing baseline tag is reported', () => {
    expect(rulesFired(missingTags)).toContain('tag-baseline');
  });

  test('a tag count outside 6–10 is reported', () => {
    expect(rulesFired(missingTags)).toContain('tag-count');
  });

  test('an all-caps title is reported', () => {
    expect(
      rulesFired({
        ...base,
        youtube: { ...base.youtube, title: 'YOUR FIRST PLAN' },
      }),
    ).toContain('title-style');
  });

  test('a leading emoji is reported', () => {
    expect(
      rulesFired({
        ...base,
        youtube: { ...base.youtube, title: '🚀 Your first plan' },
      }),
    ).toContain('title-style');
  });

  test('clickbait is reported', () => {
    expect(
      rulesFired({
        ...base,
        youtube: {
          ...base.youtube,
          title: "You won't believe this plan",
        },
      }),
    ).toContain('title-style');
  });

  test('long-form with no chapters is reported', () => {
    const outline: VideoEpisode = { ...base, format: 'longform' };

    expect(rulesFired(outline)).toContain('chapters');
  });
});

describe('isBlocking', () => {
  const draft = base;
  const ready: VideoEpisode = {
    ...base,
    release: { ...base.release, status: 'ready' },
  };
  const convention = validateEpisode({
    ...base,
    youtube: { ...base.youtube, tags: ['openthrottle'] },
  })[0];

  test('a convention finding is advisory on a draft', () => {
    expect(convention).toBeDefined();
    expect(isBlocking({ ...convention, severity: 'publish' }, draft)).toBe(
      false,
    );
  });

  test('the same finding blocks once the episode claims to be ready', () => {
    expect(convention).toBeDefined();
    expect(isBlocking({ ...convention, severity: 'publish' }, ready)).toBe(
      true,
    );
  });

  test('a structural finding blocks regardless', () => {
    expect(convention).toBeDefined();
    expect(isBlocking({ ...convention, severity: 'error' }, draft)).toBe(true);
  });
});
