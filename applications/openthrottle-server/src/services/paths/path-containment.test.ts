/**
 * @description Unit tests for segment-boundary path containment: the sibling-prefix case
 * (`/repo-two` under `/repo`) is the one a naive `startsWith` gets wrong, and getting it wrong
 * resolves a plan's workspace to the wrong repository.
 */

import { describe, expect, it } from 'vitest';
import { isPathWithin, pathDepth } from './path-containment';

describe('isPathWithin', () => {
  it('treats a path as within itself', () => {
    expect(isPathWithin('/repo', '/repo')).toBe(true);
  });

  it('ignores a trailing separator on either side', () => {
    expect(isPathWithin('/repo/', '/repo')).toBe(true);
    expect(isPathWithin('/repo', '/repo/')).toBe(true);
  });

  it('matches a nested subdirectory', () => {
    expect(isPathWithin('/repo', '/repo/applications/server')).toBe(true);
  });

  it('does not match a sibling sharing a prefix', () => {
    expect(isPathWithin('/repo', '/repo-two')).toBe(false);
    expect(isPathWithin('/repo', '/repo-two/src')).toBe(false);
  });

  it('does not match an unrelated path', () => {
    expect(isPathWithin('/repo', '/elsewhere')).toBe(false);
  });

  it('does not match a parent of the root', () => {
    expect(isPathWithin('/repo/nested', '/repo')).toBe(false);
  });

  it('treats the filesystem root as containing everything', () => {
    expect(isPathWithin('/', '/repo')).toBe(true);
  });
});

describe('pathDepth', () => {
  it('counts segments, ignoring the leading and trailing separators', () => {
    expect(pathDepth('/')).toBe(0);
    expect(pathDepth('/repo')).toBe(1);
    expect(pathDepth('/repo/nested/')).toBe(2);
  });
});
