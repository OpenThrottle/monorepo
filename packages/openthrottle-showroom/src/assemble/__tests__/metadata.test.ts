/**
 * @description The payload has to be complete enough to paste into an upload
 * form, and honest about whether the take is allowed to be pasted at all.
 *
 * `assemble.ts` used to open every description with a string literal and scrape
 * tags with a regex that matched any two-space bullet in the file. It also never
 * emitted the playlist, the chapter list, the thumbnail spec or the publish
 * state — all four were things a human remembered at upload time, which is
 * exactly the retyping `publishing.md` says must not happen.
 */

import { describe, expect, test } from 'vitest';

import { buildMetadata } from '../metadata';
import { getEpisode, resolveVariant } from '../../episodes/registry';
import { scanText } from '../../scan/scan-text';
import type { RenderFacts } from '../metadata';
import type { VideoEpisode } from '../../episodes/types';

const FACTS: RenderFacts = {
  cues: 12,
  heldSeconds: 3.5,
  musicBed: null,
  narrationBackend: 'elevenlabs',
  narrationVoice: 'will',
  portraitSource: 'landscape-crop',
};

const episode = getEpisode('05-connect-ot-mcp');
const shipping = resolveVariant(episode);

describe('completeness', () => {
  const payload = buildMetadata(episode, shipping, FACTS);

  test('carries every field an upload form asks for', () => {
    expect(payload.title).toBe(
      'Connect OpenThrottle to Claude Code in 60 seconds',
    );
    expect(payload.description.length).toBeGreaterThan(100);
    expect(payload.tags.length).toBeGreaterThan(0);
    expect(payload.playlist).toBe('getting-started');
    expect(payload.captions).toBe('05-connect-ot-mcp.srt');
    expect(payload.landscape).toBe('05-connect-ot-mcp-16x9.mp4');
    expect(payload.portrait).toBe('05-connect-ot-mcp-9x16.mp4');
  });

  test('the description is composed, not a title with a full stop', () => {
    expect(payload.description).toContain(
      'OpenThrottle is an open-source planning and execution substrate',
    );
    expect(payload.description).toContain('License: Apache-2.0');
  });

  test('tags are the episode’s, not a blind slice of a regex match', () => {
    expect(payload.tags).toEqual(episode.youtube.tags);
  });

  test('keeps the render facts the pipeline already recorded', () => {
    expect(payload.cues).toBe(12);
    expect(payload.heldSeconds).toBe(3.5);
    expect(payload.narrationBackend).toBe('elevenlabs');
    expect(payload.narrationVoice).toBe('will');
    expect(payload.portraitSource).toBe('landscape-crop');
    expect(payload.musicBed).toBeNull();
  });
});

describe('provenance', () => {
  test('names the episode, the variant and the words it spoke', () => {
    const payload = buildMetadata(episode, shipping, FACTS);

    expect(payload.episode).toBe('05-connect-ot-mcp');
    expect(payload.variant).toBe('payoff-first');
    expect(payload.spokenWords).toBe(99);
  });

  test('a different variant produces a different, self-describing payload', () => {
    const other = resolveVariant(episode, 'problem-first');
    const payload = buildMetadata(episode, other, FACTS);

    expect(payload.variant).toBe('problem-first');
    expect(payload.spokenWords).toBe(112);
  });
});

describe('publishability', () => {
  test('a draft is not publishable and says why', () => {
    const payload = buildMetadata(episode, shipping, FACTS);

    expect(payload.status).toBe('draft');
    expect(payload.publishable).toBe(false);
    expect(payload.publishBlockedBy).toContain("status is 'draft', not ready");
  });

  test('a blocked episode lists the missing feature by name', () => {
    const blocked = getEpisode('16-worktrees');
    const payload = buildMetadata(blocked, resolveVariant(blocked), FACTS);

    expect(payload.publishBlockedBy.join(' ')).toContain('Worktree state');
  });

  test('a ready, unblocked episode is publishable', () => {
    const ready: VideoEpisode = {
      ...episode,
      release: { ...episode.release, status: 'ready' },
    };
    const payload = buildMetadata(ready, shipping, FACTS);

    expect(payload.publishable).toBe(true);
    expect(payload.publishBlockedBy).toEqual([]);
  });
});

describe('long-form extras', () => {
  test('a short carries no chapters and no thumbnail spec', () => {
    const payload = buildMetadata(episode, shipping, FACTS);

    expect(payload.chapters).toEqual([]);
    expect(payload.thumbnail).toBeNull();
  });

  test('a long-form thumbnail carries its words and its template', () => {
    const longform: VideoEpisode = {
      ...episode,
      format: 'longform',
      youtube: {
        ...episode.youtube,
        chapters: [{ label: 'What this is', t: '00:00' }],
        thumbnail: { words: ['Idea', 'to', 'commit'] },
      },
    };
    const payload = buildMetadata(longform, shipping, FACTS);

    expect(payload.chapters).toHaveLength(1);
    expect(payload.thumbnail?.words).toEqual(['Idea', 'to', 'commit']);
    expect(payload.thumbnail?.template).toBe(
      'docs/marketing/assets/thumbnail-template.svg',
    );
  });

  test('the chapter list reaches the description too', () => {
    const longform: VideoEpisode = {
      ...episode,
      format: 'longform',
      youtube: {
        ...episode.youtube,
        chapters: [{ label: 'What this is', t: '00:00' }],
      },
    };

    expect(buildMetadata(longform, shipping, FACTS).description).toContain(
      '00:00 What this is',
    );
  });
});

describe('the leak scanner still sees the whole payload', () => {
  test('a secret planted in a new field is caught', () => {
    // The scanner reads metadata.json as text rather than enumerating keys, so
    // growing the payload cannot silently create an unscanned corner. This asserts
    // that rather than trusting it: the thumbnail spec and the publish blockers
    // are both new, and both are inside what gets scanned.
    const leaky: VideoEpisode = {
      ...episode,
      format: 'longform',
      production: {
        ...episode.production,
        blockedOn: ['/Users/someone/secret-project'],
      },
      youtube: {
        ...episode.youtube,
        chapters: [{ label: 'What this is', t: '00:00' }],
        thumbnail: { words: ['/home/matt/private'] },
      },
    };
    const serialised = JSON.stringify(
      buildMetadata(leaky, shipping, FACTS),
      null,
      2,
    );
    const findings = scanText('metadata.json', serialised, 'shipped');

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.map((finding) => finding.match).join(' ')).toContain(
      '/Users/someone',
    );
  });
});
