import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  parseAllowedCommands,
  resolveScheduledAgentJobLimits,
} from './scheduled-agent-jobs.utils.ts';

describe('resolveScheduledAgentJobLimits', () => {
  it('defaults to 25 jobs, 10 agent-created, no approval', () => {
    expect(resolveScheduledAgentJobLimits({})).toEqual({
      maxMcpPerOwner: 10,
      maxPerOwner: 25,
      mcpRequireApproval: false,
    });
  });

  it('reads the cap from the environment', () => {
    expect(
      resolveScheduledAgentJobLimits({
        SCHEDULED_AGENT_JOBS_MAX_PER_OWNER: '40',
      }).maxPerOwner,
    ).toBe(40);
  });

  it.each(['0', '-3', 'many', ''])('falls back to 25 for %j', (raw) => {
    expect(
      resolveScheduledAgentJobLimits({
        SCHEDULED_AGENT_JOBS_MAX_PER_OWNER: raw,
      }).maxPerOwner,
    ).toBe(25);
  });

  it('turns approval on only for true', () => {
    const on = resolveScheduledAgentJobLimits({
      SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL: 'TRUE',
    });
    const off = resolveScheduledAgentJobLimits({
      SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL: '1',
    });

    expect([on.mcpRequireApproval, off.mcpRequireApproval]).toEqual([
      true,
      false,
    ]);
  });
});

describe('parseAllowedCommands', () => {
  describe('when the field is omitted', () => {
    it('returns undefined so an update keeps the stored list', () => {
      expect(parseAllowedCommands(undefined)).toBeUndefined();
    });
  });

  describe('when the field is null', () => {
    it('returns an empty list', () => {
      expect(parseAllowedCommands(null)).toEqual([]);
    });
  });

  describe('when every entry is valid', () => {
    it('trims and de-duplicates, keeping the given order', () => {
      expect(
        parseAllowedCommands([
          ' git fetch origin main',
          'pnpm run x *',
          'git fetch origin main ',
        ]),
      ).toEqual(['git fetch origin main', 'pnpm run x *']);
    });
  });

  describe('when an entry is invalid', () => {
    it.each([
      ['empty', '   '],
      ['a line break', 'pnpm run x\nrm -rf ~'],
      ['parentheses', 'pnpm run x) Edit(*'],
      ['too long', 'x'.repeat(201)],
    ])('rejects one that is %s', (_label, entry) => {
      expect(() => {
        return parseAllowedCommands([entry]);
      }).toThrow(BadRequestException);
    });
  });

  describe('when there are too many entries', () => {
    it('rejects more than 20', () => {
      const entries = Array.from({ length: 21 }, (_unused, index) => {
        return `cmd-${index}`;
      });

      expect(() => {
        return parseAllowedCommands(entries);
      }).toThrow(/at most 20/);
    });
  });
});
