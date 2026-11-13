import { isEnvFile, isExcludedFile } from './isExcludedFile.ts';

describe('isEnvFile', () => {
  it.each([
    '.env',
    'apps/x/.env',
    '.env.local',
    '.env.production',
    '.env.default',
  ])('treats %s as an env file', (path) => {
    expect(isEnvFile(path)).toBe(true);
  });

  it.each(['environment.js', 'env.ts', 'a.env.js', '.envrc.md'])(
    'does not treat %s as an env file',
    (path) => {
      expect(isEnvFile(path)).toBe(false);
    },
  );
});

describe('isExcludedFile', () => {
  it('excludes every .env variant, wherever it sits', () => {
    expect(isExcludedFile('node_modules/x/.env')).toBe(true);
    expect(isExcludedFile('developer/server/.env.local')).toBe(true);
  });

  it('excludes source maps and repository metadata', () => {
    expect(isExcludedFile('dist/index.js.map')).toBe(true);
    expect(isExcludedFile('client/logs/.gitkeep')).toBe(true);
    expect(isExcludedFile('.DS_Store')).toBe(true);
  });

  it('keeps ordinary runtime files', () => {
    expect(isExcludedFile('node_modules/react/index.js')).toBe(false);
    expect(isExcludedFile('node_modules/react/package.json')).toBe(false);
  });
});
