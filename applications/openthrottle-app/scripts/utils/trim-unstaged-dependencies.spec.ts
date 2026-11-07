import { trimUnstagedDependencies } from './trim-unstaged-dependencies.ts';

describe('trimUnstagedDependencies', () => {
  it('removes dependencies the stage does not hold, and says which', () => {
    const result = trimUnstagedDependencies(
      {
        dependencies: { kept: '^1', missing: '^2' },
        name: 'x',
        optionalDependencies: { gone: '^3' },
        peerDependencies: { missing: '^2' },
      },
      (name) => name === 'kept',
    );

    expect(result.manifest).toEqual({
      dependencies: { kept: '^1' },
      name: 'x',
      optionalDependencies: {},
      peerDependencies: { missing: '^2' },
    });
    expect(result.removed).toEqual(['missing', 'gone']);
  });

  it('leaves a manifest without dependencies alone', () => {
    const result = trimUnstagedDependencies({ name: 'x' }, () => false);

    expect(result).toEqual({ manifest: { name: 'x' }, removed: [] });
  });
});
