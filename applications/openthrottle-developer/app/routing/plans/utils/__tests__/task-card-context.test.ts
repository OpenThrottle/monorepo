import { describe, expect, it } from 'vitest';

import { getTaskCardContext } from '~/routing/plans/utils/task-card-context';

describe('getTaskCardContext', () => {
  describe('when the text fits the limit', () => {
    it('returns it unchanged with no title', () => {
      expect(getTaskCardContext('short', 5)).toEqual({
        display: 'short',
        title: undefined,
      });
    });
  });

  describe('when the text exceeds the limit', () => {
    it('clamps with an ellipsis and keeps the full text as the title', () => {
      expect(getTaskCardContext('abcdefgh', 5)).toEqual({
        display: 'abcde…',
        title: 'abcdefgh',
      });
    });
  });
});
