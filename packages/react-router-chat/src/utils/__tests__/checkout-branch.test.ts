import { describe, expect, it } from 'vitest';

import {
  CHECKOUT_BRANCH_SOURCE,
  describeCheckoutBranch,
  resolveCheckoutBranch,
} from '../checkout-branch';

const TEMPLATE = '{branch} (default)';

describe('resolveCheckoutBranch', () => {
  describe('with no checkout', () => {
    it('returns undefined', () => {
      expect(resolveCheckoutBranch(undefined)).toBeUndefined();
    });
  });

  describe('with a current branch', () => {
    it('prefers it over the default branch', () => {
      expect(
        resolveCheckoutBranch({ branch: 'feat/x', defaultBranch: 'main' }),
      ).toEqual({ name: 'feat/x', source: CHECKOUT_BRANCH_SOURCE.current });
    });
  });

  describe('with only a default branch', () => {
    it('falls back to it, marked as the default', () => {
      expect(
        resolveCheckoutBranch({ branch: undefined, defaultBranch: 'main' }),
      ).toEqual({ name: 'main', source: CHECKOUT_BRANCH_SOURCE.default });
    });
  });

  describe('with neither branch', () => {
    it('returns undefined', () => {
      expect(
        resolveCheckoutBranch({ branch: undefined, defaultBranch: undefined }),
      ).toBeUndefined();
    });
  });

  describe('with empty strings', () => {
    it('treats an empty current branch as unknown', () => {
      expect(
        resolveCheckoutBranch({ branch: '', defaultBranch: 'main' }),
      ).toEqual({ name: 'main', source: CHECKOUT_BRANCH_SOURCE.default });
    });

    it('returns undefined when both are empty', () => {
      expect(
        resolveCheckoutBranch({ branch: '', defaultBranch: '' }),
      ).toBeUndefined();
    });
  });
});

describe('describeCheckoutBranch', () => {
  describe('with a current branch', () => {
    it('uses the bare name as the title', () => {
      expect(
        describeCheckoutBranch(
          { name: 'feat/x', source: CHECKOUT_BRANCH_SOURCE.current },
          TEMPLATE,
        ),
      ).toEqual({ isDefault: false, name: 'feat/x', title: 'feat/x' });
    });
  });

  describe('with a default branch', () => {
    it('fills the template for the title', () => {
      expect(
        describeCheckoutBranch(
          { name: 'main', source: CHECKOUT_BRANCH_SOURCE.default },
          TEMPLATE,
        ),
      ).toEqual({ isDefault: true, name: 'main', title: 'main (default)' });
    });
  });

  describe('with no branch', () => {
    it('returns empty strings', () => {
      expect(describeCheckoutBranch(undefined, TEMPLATE)).toEqual({
        isDefault: false,
        name: '',
        title: '',
      });
    });
  });
});
