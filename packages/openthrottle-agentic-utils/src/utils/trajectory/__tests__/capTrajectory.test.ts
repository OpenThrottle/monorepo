import { describe, expect, it } from 'vitest';

import type { AtifTrajectory } from '../../../types/atif.ts';
import { capTrajectory } from '../capTrajectory.ts';

const trajectoryOf = (...contents: readonly string[]): AtifTrajectory => {
  return {
    agent: { name: 'claude', version: 'test' },
    schema_version: 'ATIF-v1.8',
    steps: contents.map((content, index) => ({
      message: `step ${index}`,
      observation: { results: [{ content, source_call_id: `call-${index}` }] },
      source: 'agent',
      step_id: index + 1,
    })),
  };
};

const contentAt = (trajectory: AtifTrajectory, index: number): string => {
  return trajectory.steps[index]?.observation?.results[0]?.content ?? '';
};

const bytes = (value: string): number => {
  return new TextEncoder().encode(value).length;
};

describe('capTrajectory', () => {
  const limits = { observationBytes: 200, totalBytes: 1_000_000 };

  it('leaves a trajectory under the limits untouched', () => {
    const input = trajectoryOf('short', 'also short');
    const result = capTrajectory(input, limits);

    expect(result.truncated).toBe(false);
    expect(result.trajectory).toEqual(input);
    expect(result.byteSize).toBe(bytes(JSON.stringify(input)));
  });

  it('caps one long observation keeping its head and tail', () => {
    const long = `HEAD${'x'.repeat(5_000)}TAIL`;
    const result = capTrajectory(trajectoryOf(long, 'kept'), limits);
    const capped = contentAt(result.trajectory, 0);

    expect(result.truncated).toBe(true);
    expect(capped.startsWith('HEAD')).toBe(true);
    expect(capped.endsWith('TAIL')).toBe(true);
    expect(capped).toMatch(/\n…\[\d+ bytes elided\]…\n/);
    expect(bytes(capped)).toBeLessThanOrEqual(limits.observationBytes);
    expect(contentAt(result.trajectory, 1)).toBe('kept');
  });

  it('reports the elided byte count in the marker', () => {
    const result = capTrajectory(trajectoryOf('y'.repeat(1_000)), limits);
    const capped = contentAt(result.trajectory, 0);
    const match = /\[(\d+) bytes elided\]/.exec(capped);
    const kept = bytes(capped.replace(/\n…\[\d+ bytes elided\]…\n/, ''));

    expect(Number(match?.[1]) + kept).toBe(1_000);
  });

  it('elides the oldest observations first when the total cap is exceeded', () => {
    const body = 'z'.repeat(150);
    const input = trajectoryOf(body, body, body, body);
    const oneStep = bytes(JSON.stringify(trajectoryOf(body)));
    const result = capTrajectory(input, {
      observationBytes: 200,
      totalBytes: oneStep * 3,
    });

    expect(result.truncated).toBe(true);
    expect(contentAt(result.trajectory, 0)).toMatch(
      /^\n…\[150 bytes elided\]…\n$/,
    );
    expect(contentAt(result.trajectory, 3)).toBe(body);
    expect(result.byteSize).toBeLessThanOrEqual(oneStep * 3);
  });

  it('counts multibyte characters as bytes, not characters', () => {
    const emoji = '😀'.repeat(100);

    expect(emoji.length).toBe(200);
    expect(bytes(emoji)).toBe(400);

    const result = capTrajectory(trajectoryOf(emoji), limits);
    const capped = contentAt(result.trajectory, 0);

    expect(result.truncated).toBe(true);
    expect(bytes(capped)).toBeLessThanOrEqual(limits.observationBytes);
    expect(capped).not.toContain('�');
    expect(result.byteSize).toBe(bytes(JSON.stringify(result.trajectory)));
  });

  it('does not mutate the input', () => {
    const input = trajectoryOf('a'.repeat(5_000), 'b'.repeat(5_000));
    const before = JSON.stringify(input);

    capTrajectory(input, { observationBytes: 200, totalBytes: 500 });

    expect(JSON.stringify(input)).toBe(before);
  });

  it('applies the 16 KiB per-observation default', () => {
    const result = capTrajectory(trajectoryOf('q'.repeat(100_000)));

    expect(result.truncated).toBe(true);
    expect(bytes(contentAt(result.trajectory, 0))).toBeLessThanOrEqual(16_384);
  });
});
