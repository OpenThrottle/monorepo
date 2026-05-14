import { describe, expect, test, vi } from 'vitest';
import { buildGeneratorSupportBundle } from '../generator-last-run-storage';

describe('buildGeneratorSupportBundle', () => {
  test('formats generator name, timestamp placeholder shape, and empty output', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T12:00:00.000Z'));

    const bundle = buildGeneratorSupportBundle('nestjs', '');

    expect(bundle).toContain('generator: nestjs');
    expect(bundle).toContain('captured: 2026-05-04T12:00:00.000Z');
    expect(bundle).toContain('(empty)');

    vi.useRealTimers();
  });

  test('includes trimmed cli output when non-empty', () => {
    const bundle = buildGeneratorSupportBundle('react', '  ok  \n');

    expect(bundle).toContain('ok');
    expect(bundle).not.toContain('(empty)');
  });
});
