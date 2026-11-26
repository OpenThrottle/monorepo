// @vitest-environment node
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/resources.checkout-diff';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../resources.checkout-diff');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const loaderArgs = (search = ''): Route.LoaderArgs => {
  return createLoaderArgs<Route.LoaderArgs>({
    url: `http://localhost/resources/checkout-diff${search}`,
  });
};

const DIFF = {
  additions: 1,
  available: true,
  baseRef: 'origin/main',
  deletions: 0,
  files: [],
  filesTruncated: false,
  headBranch: 'feat/x',
  pullRequest: null,
  reason: null,
};

describe('routes/resources.checkout-diff loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('without a checkoutId', () => {
    test('answers empty without calling the server', async () => {
      const loaded = await loader(loaderArgs(''));

      expect(mockExecute).not.toHaveBeenCalled();
      expect(loaded).toEqual({
        checkoutId: '',
        kind: 'failed',
        path: undefined,
      });
    });
  });

  describe('without a path', () => {
    test('loads the checkout diff and echoes the checkout', async () => {
      mockExecute.mockResolvedValue({ checkoutDiff: DIFF });

      const loaded = await loader(loaderArgs('?checkoutId=c-1'));

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        { checkoutId: 'c-1' },
      );
      expect(loaded).toEqual({
        checkoutId: 'c-1',
        diff: DIFF,
        kind: 'diff',
      });
    });
  });

  describe('with a path', () => {
    test('loads that file patch and echoes the path', async () => {
      const file = {
        available: true,
        binary: false,
        patch: '@@',
        path: 'src/a.ts',
        reason: null,
        truncated: false,
      };
      mockExecute.mockResolvedValue({ checkoutFileDiff: file });

      const loaded = await loader(
        loaderArgs('?checkoutId=c-1&path=src%2Fa.ts'),
      );

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        { checkoutId: 'c-1', path: 'src/a.ts' },
      );
      expect(loaded).toEqual({
        checkoutId: 'c-1',
        file,
        kind: 'file',
        path: 'src/a.ts',
      });
    });
  });

  describe('when the query throws', () => {
    test('degrades to a failed result', async () => {
      mockExecute.mockRejectedValue(new Error('down'));

      const loaded = await loader(loaderArgs('?checkoutId=c-1'));

      expect(loaded).toEqual({
        checkoutId: 'c-1',
        kind: 'failed',
        path: undefined,
      });
    });
  });
});
