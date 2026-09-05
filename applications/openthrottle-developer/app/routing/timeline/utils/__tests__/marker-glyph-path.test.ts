/**
 * @description Unit tests for marker glyph geometry. The plan is explicit that
 * shape must carry meaning alongside colour, so what is actually asserted here
 * is that every kind gets a *different* shape — not merely that each returns
 * some path string.
 */

import { describe, expect, it } from 'vitest';
import { TimelineMarkerKind } from '~/__generated__/graphql';
import { markerGlyphPath, markerKindPath } from '../marker-glyph-path';
import {
  TIMELINE_MARKER_GLYPH,
  TIMELINE_MARKER_KINDS,
} from '../../config/kinds';

describe('markerGlyphPath', () => {
  it('returns a path for every glyph in the set', () => {
    for (const glyph of Object.values(TIMELINE_MARKER_GLYPH)) {
      expect(markerGlyphPath(glyph, 5)).toMatch(/^M /);
    }
  });

  it('gives every glyph a distinct shape, not just a distinct fill', () => {
    const glyphs = [...new Set(Object.values(TIMELINE_MARKER_GLYPH))];
    const paths = glyphs.map((glyph) => markerGlyphPath(glyph, 5));

    expect(new Set(paths).size).toBe(glyphs.length);
  });

  it('scales with the radius', () => {
    expect(markerGlyphPath('triangle', 5)).not.toBe(
      markerGlyphPath('triangle', 10),
    );
  });

  it('centres a glyph on the origin so callers only translate', () => {
    // The triangle's apex sits at -r on the y axis; anything else means the
    // glyph is offset and every marker would sit slightly off its timestamp.
    expect(markerGlyphPath('triangle', 6)).toContain('M 0 -6');
  });

  it('closes every path', () => {
    for (const glyph of Object.values(TIMELINE_MARKER_GLYPH)) {
      expect(markerGlyphPath(glyph, 5).trim().endsWith('Z')).toBe(true);
    }
  });

  it('points the star up rather than sideways', () => {
    expect(markerGlyphPath('star', 10)).toContain('M 0.00 -10.00');
  });
});

describe('markerKindPath', () => {
  it('maps every marker kind to a path', () => {
    for (const kind of TIMELINE_MARKER_KINDS) {
      expect(markerKindPath(kind, 5)).toMatch(/^M /);
    }
  });

  it('gives grilling its own shape, distinct from a commit', () => {
    expect(markerKindPath(TimelineMarkerKind.Grilling, 5)).not.toBe(
      markerKindPath(TimelineMarkerKind.GitCommit, 5),
    );
  });

  it('gives task-added and task-updated different shapes', () => {
    // These two land in the same lane and often within minutes of each other,
    // so they are the pair most likely to be confused.
    expect(markerKindPath(TimelineMarkerKind.TaskAdded, 5)).not.toBe(
      markerKindPath(TimelineMarkerKind.TaskUpdated, 5),
    );
  });
});
