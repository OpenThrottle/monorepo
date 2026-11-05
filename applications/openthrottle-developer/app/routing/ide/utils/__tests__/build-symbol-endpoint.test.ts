import { describe, expect, it } from 'vitest';

import { buildSymbolEndpoint } from '../build-symbol-endpoint';

describe('buildSymbolEndpoint', () => {
  describe('without a selected repository', () => {
    it('returns the bare endpoint', () => {
      expect(buildSymbolEndpoint(null)).toBe('/ide/symbol');
    });
  });

  describe('with a selected repository', () => {
    it('scopes the endpoint to the repository', () => {
      expect(buildSymbolEndpoint('repo-1')).toBe(
        '/ide/symbol?repositoryId=repo-1',
      );
    });
  });
});
