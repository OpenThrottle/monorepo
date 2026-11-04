import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_IDENTITY,
  isRegisteredArtifactType,
  registeredArtifactTypes,
  resolveArtifactForWrite,
  shouldFireLifecycleTriggers,
} from './artifact-type-registry.ts';

describe('artifact-type-registry', () => {
  it('registers the seed types', () => {
    expect([...registeredArtifactTypes()].sort()).toEqual([
      'deployment',
      'document',
      'git_commit',
      'plan_promotion',
      'pull_request',
      'status_change',
    ]);
    expect(isRegisteredArtifactType('git_commit')).toBe(true);
    expect(isRegisteredArtifactType('nope')).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(() => resolveArtifactForWrite('nope', {})).toThrow(
      /Unknown work artifact type/,
    );
  });

  it('validates payloads against the type schema', () => {
    expect(() =>
      resolveArtifactForWrite('git_commit', { repo: 'a/b' }),
    ).toThrow();
    expect(() =>
      resolveArtifactForWrite('git_commit', {
        extra: 1,
        repo: 'a/b',
        sha: 'abc',
      }),
    ).toThrow();
  });

  it('derives a canonical, stable key for idempotent types', () => {
    const first = resolveArtifactForWrite('git_commit', {
      repo: 'OpenThrottle/monorepo',
      sha: 'deadbeef',
    });
    const second = resolveArtifactForWrite('git_commit', {
      repo: 'OpenThrottle/monorepo',
      sha: 'deadbeef',
    });

    expect(first.identity).toBe(ARTIFACT_IDENTITY.IDEMPOTENT);
    expect(first.initialLifecycle).toBe('created');
    expect(first.externalKey).toBe('github:OpenThrottle/monorepo@deadbeef');
    // Idempotent: same payload → same key (so re-reports upsert).
    expect(second.externalKey).toBe(first.externalKey);
  });

  it('discriminates event-type keys so repeated events append', () => {
    const payload = {
      entity: 'task',
      from: 'PENDING',
      id: 'task-1',
      to: 'COMPLETED',
    };
    const first = resolveArtifactForWrite('status_change', payload);
    const second = resolveArtifactForWrite('status_change', payload);

    expect(first.identity).toBe(ARTIFACT_IDENTITY.EVENT);
    expect(first.externalKey).toContain('status_change:task:task-1:COMPLETED:');
    // Event: same transition → distinct keys (so each is a separate append-only row).
    expect(second.externalKey).not.toBe(first.externalKey);
  });
  describe('shouldFireLifecycleTriggers', () => {
    const landing = (
      overrides: Partial<Parameters<typeof shouldFireLifecycleTriggers>[0]>,
    ) =>
      shouldFireLifecycleTriggers({
        fireTriggers: undefined,
        lifecycle: 'landed',
        source: 'agent',
        type: 'git_commit',
        ...overrides,
      });

    it('fires for live agent-reported work', () => {
      expect(landing({})).toBe(true);
      expect(landing({ source: 'human' })).toBe(true);
    });

    it('suppresses bulk and adapter sources', () => {
      expect(landing({ source: 'legacy' })).toBe(false);
      expect(landing({ source: 'adapter' })).toBe(false);
    });

    it('lets an explicit fireTriggers override the source rule in both directions', () => {
      expect(landing({ fireTriggers: false })).toBe(false);
      expect(landing({ fireTriggers: true, source: 'legacy' })).toBe(true);
    });

    it("never fires for a state outside the type's triggerStates", () => {
      expect(landing({ lifecycle: 'created' })).toBe(false);
      expect(landing({ fireTriggers: true, lifecycle: 'created' })).toBe(false);
      expect(landing({ lifecycle: 'merged', type: 'pull_request' })).toBe(
        false,
      );
    });

    it('never fires for an unregistered type', () => {
      expect(landing({ fireTriggers: true, type: 'nope' })).toBe(false);
    });
  });
});
