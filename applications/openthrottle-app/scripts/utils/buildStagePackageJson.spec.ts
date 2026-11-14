import { buildStagePackageJson } from './buildStagePackageJson.ts';

describe('buildStagePackageJson', () => {
  const result = buildStagePackageJson(
    { author: 'A', description: 'd', license: 'MIT', version: '1.2.3' },
    { express: '5.3.0' },
    '45.2.1',
  );

  it('points main at the bundled entry and is ESM', () => {
    expect(result).toMatchObject({
      main: './out/main/main.js',
      type: 'module',
    });
  });

  it('lists the staged packages and nothing dev-only', () => {
    expect(result.dependencies).toEqual({ express: '5.3.0' });
    expect(result.devDependencies).toEqual({ electron: '45.2.1' });
    expect(result).not.toHaveProperty('scripts');
  });

  it('has electron-builder walk the real tree', () => {
    expect(result.packageManager).toBe('traversal@1.0.0');
  });

  it('is named OpenThrottle', () => {
    expect(result.productName).toBe('OpenThrottle');
  });

  it('carries the app manifest version, which app.getVersion() reports', () => {
    const bumped = buildStagePackageJson(
      { author: 'A', description: 'd', license: 'MIT', version: '4.5.6' },
      {},
      '45.2.1',
    );

    expect(result.version).toBe('1.2.3');
    expect(bumped.version).toBe('4.5.6');
  });
});
