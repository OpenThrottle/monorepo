import { describe, expect, test } from 'vitest';
import { toLinkedArtifactView } from '../linked-artifact-payload';

const view = (type: string, payload: unknown, externalKey = 'key:1') =>
  toLinkedArtifactView({
    externalKey,
    payloadJson: JSON.stringify(payload),
    type,
  });

describe('toLinkedArtifactView', () => {
  describe('git_commit', () => {
    test('labels as owner/repo@<short sha>', () => {
      const result = view('git_commit', {
        repo: 'openthrottle/monorepo',
        sha: 'abc1234def5678',
      });

      expect(result.kind).toBe('git_commit');
      expect(result.label).toBe('openthrottle/monorepo@abc1234');
    });

    test('surfaces landedSha only when it differs from sha', () => {
      const differing = view('git_commit', {
        landedSha: 'zzz9999',
        repo: 'o/r',
        sha: 'abc1234',
      });
      const same = view('git_commit', {
        landedSha: 'abc1234',
        repo: 'o/r',
        sha: 'abc1234',
      });

      expect(differing).toMatchObject({ landedSha: 'zzz9999' });
      expect(same).not.toHaveProperty('landedSha');
    });

    test('degrades when sha is missing', () => {
      expect(view('git_commit', { repo: 'o/r' }).kind).toBe('unknown');
    });
  });

  describe('pull_request', () => {
    test('labels as owner/repo#<number>', () => {
      const result = view('pull_request', { number: 509, repo: 'o/r' });

      expect(result.kind).toBe('pull_request');
      expect(result.label).toBe('o/r#509');
    });

    test('degrades when number is not a number', () => {
      expect(view('pull_request', { number: '509', repo: 'o/r' }).kind).toBe(
        'unknown',
      );
    });
  });

  describe('document', () => {
    test('prefers the title over the url', () => {
      expect(
        view('document', { title: 'Design', url: 'https://x' }).label,
      ).toBe('Design');
    });

    test('falls back to the url when untitled', () => {
      expect(view('document', { url: 'https://x' }).label).toBe('https://x');
    });
  });

  describe('deployment', () => {
    test('labels with the environment and keeps ref/url', () => {
      const result = view('deployment', {
        environment: 'production',
        ref: 'main',
        url: 'https://deploy',
      });

      expect(result.label).toBe('production');
      expect(result).toMatchObject({ ref: 'main', url: 'https://deploy' });
    });
  });

  describe('status_change', () => {
    test('renders the from → to transition', () => {
      const result = view('status_change', {
        entity: 'task',
        from: 'PENDING',
        id: 'task-1',
        to: 'COMPLETED',
      });

      expect(result.label).toBe('PENDING → COMPLETED');
      expect(result).toMatchObject({
        entity: 'task',
        entityId: 'task-1',
        transition: { from: 'PENDING', to: 'COMPLETED' },
      });
    });

    test('renders only the target state when from is null (initial)', () => {
      const result = view('status_change', {
        entity: 'plan',
        from: null,
        id: 'plan-1',
        to: 'PENDING',
      });

      expect(result.label).toBe('PENDING');
      expect(result).toMatchObject({ transition: { from: null } });
    });

    test('degrades on an entity outside plan|task', () => {
      expect(
        view('status_change', { entity: 'run', id: 'r', to: 'DONE' }).kind,
      ).toBe('unknown');
    });
  });

  describe('plan_promotion', () => {
    test('labels as a promotion and keeps the new plan id', () => {
      const result = view('plan_promotion', {
        newPlanId: 'plan-2',
        sourcePlanId: 'plan-1',
        sourceTaskId: 'task-1',
      });

      expect(result.label).toBe('promoted to a new plan');
      expect(result).toMatchObject({ newPlanId: 'plan-2' });
    });
  });

  describe('graceful degradation', () => {
    test('malformed JSON falls back to type + externalKey without throwing', () => {
      const result = toLinkedArtifactView({
        externalKey: 'github:o/r@abc',
        payloadJson: '{not json',
        type: 'git_commit',
      });

      expect(result.kind).toBe('unknown');
      expect(result.label).toBe('git_commit github:o/r@abc');
    });

    test('a non-object payload falls back', () => {
      expect(view('git_commit', ['array']).kind).toBe('unknown');
    });

    test('an unregistered type falls back rather than assuming a closed set', () => {
      const result = toLinkedArtifactView({
        externalKey: 'sbom:o/r@1',
        payloadJson: '{"anything":true}',
        type: 'sbom',
      });

      expect(result.kind).toBe('unknown');
      expect(result.label).toBe('sbom sbom:o/r@1');
    });
  });
});
