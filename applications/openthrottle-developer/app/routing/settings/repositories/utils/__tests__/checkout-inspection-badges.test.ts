import { describe, expect, test } from 'vitest';
import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';
import { deriveCheckoutInspectionBadges } from '../checkout-inspection-badges';

type CheckoutInspection = RepositoryCheckoutFieldsFragment['inspection'];

const inspection: NonNullable<CheckoutInspection> = {
  agentConfig: {
    agentsMd: true,
    claudeMd: true,
    cursorRules: false,
    mcpJson: true,
    skillsDir: false,
  },
  git: {
    currentBranch: 'main',
    defaultBranch: 'main',
    dirty: false,
    isRepo: true,
    linkedWorktrees: [],
    normalizedRemoteUrl: 'https://github.com/acme/monorepo',
  },
  scannedAt: '2026-07-24T00:00:00.000Z',
  stack: {
    languages: ['typescript'],
    nxWorkspace: true,
    packageManager: 'pnpm',
    pnpmWorkspace: true,
    turbo: false,
  },
  warnings: [],
};

describe('deriveCheckoutInspectionBadges', () => {
  test('derives stack badges in a stable order, dropping falsey flags', () => {
    const { detectedStack } = deriveCheckoutInspectionBadges(inspection);

    // turbo is false, so it is omitted; packageManager + languages trail.
    expect(detectedStack).toEqual([
      'Nx',
      'pnpm workspace',
      'pnpm',
      'typescript',
    ]);
  });

  test('derives agent-config badges, dropping disabled entries', () => {
    const { detectedAgentConfig } = deriveCheckoutInspectionBadges(inspection);

    // cursorRules + skillsDir are false, so only the enabled ones remain.
    expect(detectedAgentConfig).toEqual([
      '.mcp.json',
      'CLAUDE.md',
      'AGENTS.md',
    ]);
  });

  test('drops a nullish packageManager from the stack', () => {
    const { detectedStack } = deriveCheckoutInspectionBadges({
      ...inspection,
      stack: { ...inspection.stack, packageManager: null },
    });

    expect(detectedStack).toEqual(['Nx', 'pnpm workspace', 'typescript']);
  });

  test('returns empty arrays when the checkout has no inspection', () => {
    expect(deriveCheckoutInspectionBadges(null)).toEqual({
      detectedAgentConfig: [],
      detectedStack: [],
    });
  });
});
