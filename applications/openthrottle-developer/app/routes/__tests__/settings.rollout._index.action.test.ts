// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/settings.rollout._index';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../settings.rollout._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (formData: FormData): Route.ActionArgs => {
  const request = new Request('http://localhost/settings/rollout', {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/settings/rollout',
    request,
    url: new URL(request.url),
  };
};

const validCreateFormData = (): FormData => {
  const formData = new FormData();
  formData.set('intent', 'createRolloutFlag');
  formData.set('key', 'new-dashboard');
  formData.set('kind', 'boolean');
  formData.set('offVariation', '0');
  formData.set(
    'variationsJson',
    JSON.stringify([
      { description: '', name: '', valueJson: 'false' },
      { description: '', name: '', valueJson: 'true' },
    ]),
  );
  formData.set(
    'fallthroughJson',
    JSON.stringify({ variations: [{ variation: 1, weight: 100 }] }),
  );
  return formData;
};

describe('routes/settings.rollout._index action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns an error when the flag key is missing', async () => {
    const formData = new FormData();
    formData.set('intent', 'createRolloutFlag');

    const result = await action(buildArgs(formData));

    expect(result).toEqual({ error: 'A flag key is required.' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('returns an error when the typed config fails to parse', async () => {
    const formData = new FormData();
    formData.set('intent', 'createRolloutFlag');
    formData.set('key', 'new-dashboard');

    const result = await action(buildArgs(formData));

    expect(result).toHaveProperty('error');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('creates the flag via GraphQL and returns ok on success', async () => {
    mockExecute.mockResolvedValueOnce({
      createRolloutFlag: { id: 'flag-1' },
    });

    const result = await action(buildArgs(validCreateFormData()));

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  test('returns the GraphQL error message when creation fails', async () => {
    mockExecute.mockRejectedValueOnce(new Error('flag already exists'));

    const result = await action(buildArgs(validCreateFormData()));

    expect(result).toEqual({ error: 'flag already exists' });
  });

  test('returns an error when deleting without an id', async () => {
    const formData = new FormData();
    formData.set('intent', 'deleteRolloutFlag');

    const result = await action(buildArgs(formData));

    expect(result).toEqual({ error: 'Missing flag id.' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('deletes the flag via GraphQL and returns ok on success', async () => {
    mockExecute.mockResolvedValueOnce({ deleteRolloutFlag: true });

    const formData = new FormData();
    formData.set('intent', 'deleteRolloutFlag');
    formData.set('id', 'flag-1');

    const result = await action(buildArgs(formData));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { id: 'flag-1' },
    );
    expect(result).toEqual({ ok: true });
  });

  test('returns the GraphQL error message when deletion fails', async () => {
    mockExecute.mockRejectedValueOnce(new Error('flag not found'));

    const formData = new FormData();
    formData.set('intent', 'deleteRolloutFlag');
    formData.set('id', 'missing');

    const result = await action(buildArgs(formData));

    expect(result).toEqual({ error: 'flag not found' });
  });

  test('throws for an unrecognized intent', async () => {
    const formData = new FormData();
    formData.set('intent', 'unknown-intent');

    await expect(action(buildArgs(formData))).rejects.toThrow('Invalid intent');
  });
});
