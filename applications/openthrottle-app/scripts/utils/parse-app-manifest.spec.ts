import { parseAppManifest } from './parse-app-manifest.ts';

describe('parseAppManifest', () => {
  it('reads the copied fields', () => {
    const result = parseAppManifest({
      author: { name: 'a' },
      description: 'd',
      license: 'MIT',
      version: '1.0.0',
    });

    expect(result.ok && result.manifest.version).toBe('1.0.0');
  });

  it.each([
    null,
    'x',
    { description: 'd' },
    { description: 1, license: 'x', version: '1' },
  ])('rejects %j', (value) => {
    expect(parseAppManifest(value).ok).toBe(false);
  });
});
