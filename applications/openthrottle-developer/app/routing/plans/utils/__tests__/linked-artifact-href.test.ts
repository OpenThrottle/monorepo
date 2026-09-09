import { describe, expect, test } from 'vitest';
import { toLinkedArtifactDestination } from '../linked-artifact-href';
import { toLinkedArtifactView } from '../linked-artifact-payload';

const PLAN_ID = 'plan-1';

const destinationFor = (
  type: string,
  payload: unknown,
  planId: string | null = PLAN_ID,
) =>
  toLinkedArtifactDestination(
    toLinkedArtifactView({
      externalKey: 'key:1',
      payloadJson: JSON.stringify(payload),
      type,
    }),
    planId,
  );

describe('toLinkedArtifactDestination', () => {
  describe('git_commit', () => {
    test('links to the GitHub commit for the claimed sha', () => {
      expect(
        destinationFor('git_commit', { repo: 'o/r', sha: 'abc1234' }),
      ).toEqual({
        href: 'https://github.com/o/r/commit/abc1234',
        kind: 'external',
      });
    });

    test('prefers the landed sha when one is recorded', () => {
      expect(
        destinationFor('git_commit', {
          landedSha: 'landed99',
          repo: 'o/r',
          sha: 'abc1234',
        }),
      ).toEqual({
        href: 'https://github.com/o/r/commit/landed99',
        kind: 'external',
      });
    });
  });

  test('pull_request links to the GitHub PR', () => {
    expect(
      destinationFor('pull_request', { number: 509, repo: 'o/r' }),
    ).toEqual({
      href: 'https://github.com/o/r/pull/509',
      kind: 'external',
    });
  });

  describe('document', () => {
    test('links to the payload url', () => {
      expect(destinationFor('document', { url: 'https://docs' })).toEqual({
        href: 'https://docs',
        kind: 'external',
      });
    });
  });

  describe('deployment', () => {
    test('links to the payload url when present', () => {
      expect(
        destinationFor('deployment', {
          environment: 'production',
          url: 'https://deploy',
        }),
      ).toEqual({ href: 'https://deploy', kind: 'external' });
    });

    test('has no destination when the payload carries no url', () => {
      expect(
        destinationFor('deployment', { environment: 'production' }),
      ).toEqual({ kind: 'none' });
    });
  });

  describe('status_change', () => {
    test('links a task transition to the task route under the caller plan id', () => {
      expect(
        destinationFor('status_change', {
          entity: 'task',
          from: 'PENDING',
          id: 'task-9',
          to: 'COMPLETED',
        }),
      ).toEqual({ kind: 'internal', to: '/plans/plan-1/tasks/task-9' });
    });

    test('links a plan transition to the plan route', () => {
      expect(
        destinationFor('status_change', {
          entity: 'plan',
          from: null,
          id: 'plan-1',
          to: 'PENDING',
        }),
      ).toEqual({ kind: 'internal', to: '/plans/plan-1' });
    });

    test('has no destination without a caller-supplied plan id', () => {
      expect(
        destinationFor(
          'status_change',
          { entity: 'task', from: null, id: 'task-9', to: 'COMPLETED' },
          null,
        ),
      ).toEqual({ kind: 'none' });
    });
  });

  test('plan_promotion links in-app to the new plan', () => {
    expect(
      destinationFor('plan_promotion', {
        newPlanId: 'plan-2',
        sourcePlanId: 'plan-1',
        sourceTaskId: 'task-1',
      }),
    ).toEqual({ kind: 'internal', to: '/plans/plan-2' });
  });

  describe('no destination', () => {
    test('an unregistered type has none', () => {
      expect(destinationFor('sbom', { anything: true })).toEqual({
        kind: 'none',
      });
    });

    test('a malformed payload has none rather than a dead href', () => {
      expect(
        toLinkedArtifactDestination(
          toLinkedArtifactView({
            externalKey: 'github:o/r@abc',
            payloadJson: '{not json',
            type: 'git_commit',
          }),
          PLAN_ID,
        ),
      ).toEqual({ kind: 'none' });
    });
  });
});
