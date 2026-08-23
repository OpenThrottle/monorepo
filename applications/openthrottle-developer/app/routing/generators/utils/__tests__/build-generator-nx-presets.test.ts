import { describe, expect, test } from 'vitest';
import { buildGeneratorNxPresets } from '../build-generator-nx-presets';

describe('buildGeneratorNxPresets', () => {
  test('includes list, describe, and example --list command with generator name', () => {
    const presets = buildGeneratorNxPresets('react-router');

    expect(presets.map((p) => p.id)).toEqual([
      'list-generators',
      'describe',
      'describe-pnpm',
      'dry-run',
      'list-destinations-example',
    ]);

    expect(presets[1]?.command).toContain('@tools/generators:react-router');
    expect(presets[1]?.command).toContain('--describe');
    expect(presets[2]?.command).toContain(
      'pnpm nx g @tools/generators:react-router',
    );
    expect(presets[2]?.command).toContain('--describe');
    expect(presets[3]?.command).toContain('@tools/generators:react-router');
    expect(presets[3]?.command).toContain('--dry-run');
    expect(presets[4]?.command).toContain('@tools/generators:react-router');
    expect(presets[4]?.command).toContain('--list=destinations');
  });
});
