import { describe, expect, it } from 'vitest';

import { CHAT_SESSION_DRAWER_COPY } from '../../data/copy';
import {
  CHAT_CHECKOUT_KIND,
  CHAT_PERMISSION_MODE,
  CHAT_REASONING_LEVEL,
} from '../../types';
import { buildEnvironmentRows } from '../session-environment';

const LABELS = {
  agent: 'Agent',
  branch: 'Branch',
  branchDefault: CHAT_SESSION_DRAWER_COPY.environment.branchDefault,
  checkout: 'Checkout',
  model: 'Model',
  permissions: 'Permissions',
};

const keys = (
  rows: ReturnType<typeof buildEnvironmentRows>,
): readonly string[] => {
  return rows.map((row) => row.key);
};

describe('buildEnvironmentRows', () => {
  describe('with only the repository default branch known', () => {
    const environment = {
      agentLabel: undefined,
      checkout: {
        defaultBranch: 'main',
        id: 'c1',
        label: 'monorepo',
      },
      modelLabel: undefined,
      permissionMode: undefined,
      reasoning: undefined,
    };

    it('labels the branch as the unscanned default', () => {
      const branch = buildEnvironmentRows(environment, undefined, LABELS).find(
        (row) => row.key === 'branch',
      );

      expect(branch?.value).toBe('main (repo default)');
    });

    it('shows the live head branch plainly when the host has one', () => {
      const branch = buildEnvironmentRows(environment, 'feat/x', LABELS).find(
        (row) => row.key === 'branch',
      );

      expect(branch?.value).toBe('feat/x');
    });
  });

  describe('with nothing reported', () => {
    it('has no rows', () => {
      expect(buildEnvironmentRows(undefined, undefined, LABELS)).toEqual([]);
    });
  });

  describe('with a full environment', () => {
    const environment = {
      agentLabel: 'Claude Code',
      checkout: {
        branch: 'feat/x',
        defaultBranch: undefined,
        filesystemPath: '/Users/me/dev/monorepo-worktree',
        id: 'c1',
        kind: CHAT_CHECKOUT_KIND.worktree,
        label: 'monorepo',
      },
      modelLabel: 'Opus',
      permissionMode: CHAT_PERMISSION_MODE.supervised,
      reasoning: CHAT_REASONING_LEVEL.high,
    };

    it('lists rows in display order', () => {
      const rows = buildEnvironmentRows(environment, undefined, LABELS);

      expect(keys(rows)).toEqual([
        'checkout',
        'branch',
        'model',
        'permissions',
        'agent',
      ]);
    });

    it('puts the full path in the checkout title and a short one in detail', () => {
      const [checkout] = buildEnvironmentRows(environment, undefined, LABELS);

      expect(checkout?.title).toBe('/Users/me/dev/monorepo-worktree');
      expect(checkout?.detail).toBeDefined();
      expect(checkout?.label).toBe('Checkout');
    });

    it('appends the reasoning tier to the model', () => {
      const rows = buildEnvironmentRows(environment, undefined, LABELS);
      const model = rows.find((row) => row.key === 'model');

      expect(model?.value).toBe('Opus · High');
    });

    it('prefers the live head branch over the checkout branch', () => {
      const rows = buildEnvironmentRows(environment, 'live/branch', LABELS);
      const branch = rows.find((row) => row.key === 'branch');

      expect(branch?.value).toBe('live/branch');
    });
  });

  describe('with a partial environment', () => {
    it('omits rows for missing or empty values', () => {
      const rows = buildEnvironmentRows(
        {
          agentLabel: '',
          checkout: undefined,
          modelLabel: 'Opus',
          permissionMode: undefined,
          reasoning: undefined,
        },
        '',
        LABELS,
      );

      expect(keys(rows)).toEqual(['model']);
      expect(rows[0]?.value).toBe('Opus');
    });
  });
});
