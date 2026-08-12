// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import {
  DeleteRolloutFlagDocument,
  UpdateRolloutFlagDocument,
} from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import type { Route } from '@/app/routes/+types/settings.rollout.$flagId.edit';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../settings.rollout.$flagId.edit');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const VALID_VARIATIONS_JSON = JSON.stringify([
  { valueJson: 'false' },
  { valueJson: 'true' },
]);
const VALID_FALLTHROUGH_JSON = JSON.stringify({
  variations: [{ variation: 1, weight: 100 }],
});

const buildArgs = (
  flagId: string,
  body: Record<string, string>,
): Route.ActionArgs => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) {
    formData.set(key, value);
  }
  const request = new Request(
    `http://localhost/settings/rollout/${flagId}/edit`,
    { body: formData, method: 'POST' },
  );
  return {
    context: createTestRouterContext(),
    params: { flagId },
    pattern: '/settings/rollout/:flagId/edit',
    request,
    url: new URL(request.url),
  };
};

describe('routes/settings.rollout.$flagId.edit action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('updateRolloutFlag intent', () => {
    test('updates the flag and redirects to the detail page', async () => {
      mockExecute.mockResolvedValue({ updateRolloutFlag: { id: 'flag-1' } });

      const result = await action(
        buildArgs('flag-1', {
          enabled: 'on',
          fallthroughJson: VALID_FALLTHROUGH_JSON,
          intent: 'updateRolloutFlag',
          key: 'new-dashboard',
          kind: 'boolean',
          offVariation: '0',
          targetRoles: 'admin, ops',
          variationsJson: VALID_VARIATIONS_JSON,
        }),
      );

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        UpdateRolloutFlagDocument,
        {
          input: expect.objectContaining({
            description: null,
            enabled: true,
            id: 'flag-1',
            key: 'new-dashboard',
            kind: 'boolean',
            offVariation: 0,
            targetRoles: ['admin', 'ops'],
          }),
        },
      );
      if (!(result instanceof Response)) {
        throw new Error('Expected a redirect Response.');
      }
      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toBe('/settings/rollout/flag-1');
    });

    test('returns an error and skips GraphQL when the key is missing', async () => {
      const result = await action(
        buildArgs('flag-1', {
          fallthroughJson: VALID_FALLTHROUGH_JSON,
          intent: 'updateRolloutFlag',
          kind: 'boolean',
          offVariation: '0',
          variationsJson: VALID_VARIATIONS_JSON,
        }),
      );

      expect(result).toEqual({ error: 'A flag key is required.' });
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('returns a typed-config error and skips GraphQL when the kind is invalid', async () => {
      const result = await action(
        buildArgs('flag-1', {
          fallthroughJson: VALID_FALLTHROUGH_JSON,
          intent: 'updateRolloutFlag',
          key: 'new-dashboard',
          kind: 'not-a-kind',
          offVariation: '0',
          variationsJson: VALID_VARIATIONS_JSON,
        }),
      );

      expect(result).toEqual({ error: ROLLOUT_COPY.kindRequiredError });
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('returns the error message when the mutation throws', async () => {
      mockExecute.mockRejectedValue(new Error('boom'));

      const result = await action(
        buildArgs('flag-1', {
          fallthroughJson: VALID_FALLTHROUGH_JSON,
          intent: 'updateRolloutFlag',
          key: 'new-dashboard',
          kind: 'boolean',
          offVariation: '0',
          variationsJson: VALID_VARIATIONS_JSON,
        }),
      );

      expect(result).toEqual({ error: 'boom' });
    });
  });

  describe('deleteRolloutFlag intent', () => {
    test('deletes the flag and redirects to the rollout list', async () => {
      mockExecute.mockResolvedValue({ deleteRolloutFlag: true });

      const result = await action(
        buildArgs('flag-1', { intent: 'deleteRolloutFlag' }),
      );

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        DeleteRolloutFlagDocument,
        { id: 'flag-1' },
      );
      if (!(result instanceof Response)) {
        throw new Error('Expected a redirect Response.');
      }
      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toBe('/settings/rollout');
    });

    test('returns the error message when the mutation throws', async () => {
      mockExecute.mockRejectedValue(new Error('cannot delete'));

      const result = await action(
        buildArgs('flag-1', { intent: 'deleteRolloutFlag' }),
      );

      expect(result).toEqual({ error: 'cannot delete' });
    });
  });

  test('throws on an unrecognized intent', async () => {
    await expect(
      action(buildArgs('flag-1', { intent: 'somethingElse' })),
    ).rejects.toThrow('Invalid intent');
  });
});
