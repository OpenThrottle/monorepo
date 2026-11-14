import { resolveStageTargets } from './resolveStageTargets.ts';

describe('resolveStageTargets', () => {
  it('stages the host arch when no --arch is given', () => {
    expect(resolveStageTargets([], 'arm64')).toEqual({
      arch: 'arm64',
      ok: true,
      targets: ['darwin-arm64'],
    });
  });

  it('stages both macOS arches for universal', () => {
    expect(resolveStageTargets(['--arch', 'universal'], 'arm64')).toEqual({
      arch: 'universal',
      ok: true,
      targets: ['darwin-arm64', 'darwin-x64'],
    });
  });

  it('accepts the --arch=<value> form', () => {
    expect(resolveStageTargets(['--arch=x64'], 'arm64')).toEqual({
      arch: 'x64',
      ok: true,
      targets: ['darwin-x64'],
    });
  });

  it('rejects an unknown arch', () => {
    expect(resolveStageTargets(['--arch', 'ia32'], 'arm64').ok).toBe(false);
  });

  it('rejects a flag with no value', () => {
    expect(resolveStageTargets(['--arch'], 'arm64').ok).toBe(false);
  });

  it('rejects an unsupported host arch', () => {
    expect(resolveStageTargets([], 'ia32').ok).toBe(false);
  });
});
