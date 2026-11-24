import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSkillUsageWindow,
  loadSkillDetailUsage,
  loadSkillsIndexUsage,
} from '../skill-usage-loaders';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

describe('getSkillUsageWindow', () => {
  it('spans the trailing 30 days as YYYY-MM-DD', () => {
    expect(getSkillUsageWindow(new Date('2026-08-31T12:00:00Z'))).toEqual({
      end: '2026-08-31',
      start: '2026-08-01',
    });
  });
});

describe('usage loaders failure fallback', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockRejectedValue(new Error('forbidden'));
  });

  it('loadSkillsIndexUsage resolves the unavailable sentinel', async () => {
    await expect(
      loadSkillsIndexUsage(new Request('http://localhost/skills')),
    ).resolves.toEqual({ available: false });
  });

  it('loadSkillDetailUsage resolves the unavailable sentinel', async () => {
    await expect(
      loadSkillDetailUsage(new Request('http://localhost/skills/x'), 'x'),
    ).resolves.toEqual({ available: false });
  });
});
