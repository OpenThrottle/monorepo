import { describe, expect, test } from 'vitest';

import { TRAJECTORY_SUMMARY_COPY } from '~/routing/evals/data/data.copy';

import {
  clampTrajectoryText,
  formatTrajectoryAgent,
  formatTrajectoryArgumentsPreview,
  formatTrajectoryCost,
  formatTrajectoryDuration,
  formatTrajectorySource,
  formatTrajectoryTokens,
} from '../formatters';

describe('formatTrajectoryCost', () => {
  test('reads null as unpriced, never $0', () => {
    expect(formatTrajectoryCost(null)).toBe(TRAJECTORY_SUMMARY_COPY.unpriced);
  });

  test('formats a real zero and a priced run as USD', () => {
    expect(formatTrajectoryCost(0)).toBe('$0.00');
    expect(formatTrajectoryCost(0.4213)).toBe('$0.4213');
  });
});

describe('formatTrajectoryDuration', () => {
  test.each([
    [850, '850ms'],
    [42_000, '42s'],
    [187_000, '3m 07s'],
    [3_720_000, '1h 02m'],
  ])('%i ms reads as %s', (ms, expected) => {
    expect(formatTrajectoryDuration(ms)).toBe(expected);
  });

  test('reads null as unknown', () => {
    expect(formatTrajectoryDuration(null)).toBe(
      TRAJECTORY_SUMMARY_COPY.unknown,
    );
  });
});

describe('formatTrajectoryTokens', () => {
  test('shows cached tokens inside the prompt count', () => {
    expect(
      formatTrajectoryTokens({
        cachedTokens: 9_800,
        inputTokens: 12_400,
        outputTokens: 1_250,
      }),
    ).toBe('12,400 in (9,800 cached) / 1,250 out');
  });

  test('omits cached when there were none', () => {
    expect(
      formatTrajectoryTokens({
        cachedTokens: null,
        inputTokens: 10,
        outputTokens: null,
      }),
    ).toBe(`10 in / ${TRAJECTORY_SUMMARY_COPY.unknown} out`);
  });
});

describe('formatTrajectorySource', () => {
  test('labels both capture paths and passes unknown ones through', () => {
    expect(formatTrajectorySource('spawned')).toBe(
      TRAJECTORY_SUMMARY_COPY.sourceSpawned,
    );
    expect(formatTrajectorySource('session_upload')).toBe(
      TRAJECTORY_SUMMARY_COPY.sourceSessionUpload,
    );
    expect(formatTrajectorySource('other')).toBe('other');
  });
});

describe('formatTrajectoryArgumentsPreview', () => {
  test('cuts long arguments with an ellipsis', () => {
    expect(formatTrajectoryArgumentsPreview({ a: 'x'.repeat(50) }, 10)).toBe(
      '{"a":"xxxx…',
    );
  });
});

describe('clampTrajectoryText', () => {
  test('does not clamp short text', () => {
    expect(clampTrajectoryText('a\nb', { maxChars: 100, maxLines: 5 })).toEqual(
      {
        isClamped: false,
        lineCount: 2,
        visible: 'a\nb',
      },
    );
  });

  test('clamps by lines and by characters', () => {
    expect(
      clampTrajectoryText('1\n2\n3\n4', { maxChars: 100, maxLines: 2 }).visible,
    ).toBe('1\n2');
    expect(
      clampTrajectoryText('x'.repeat(20), { maxChars: 5, maxLines: 2 }),
    ).toEqual({ isClamped: true, lineCount: 1, visible: 'xxxxx' });
  });
});

describe('formatTrajectoryAgent', () => {
  test('joins name and version', () => {
    expect(
      formatTrajectoryAgent(
        { name: 'claude-code', version: '2.1.0' },
        'claude',
      ),
    ).toBe('claude-code 2.1.0');
  });

  test('leaves off a version the capture could not determine', () => {
    expect(
      formatTrajectoryAgent({ name: 'claude', version: 'unknown' }, 'claude'),
    ).toBe('claude');
  });

  test('falls back to the driver without a document', () => {
    expect(formatTrajectoryAgent(undefined, 'codex')).toBe('codex');
  });
});
