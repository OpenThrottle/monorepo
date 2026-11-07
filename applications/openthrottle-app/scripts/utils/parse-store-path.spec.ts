import {
  parseStoreDirPath,
  parseStoreFilePath,
  parseStoreOwner,
  parseStoreVersion,
} from './parse-store-path.ts';

describe('parseStoreVersion', () => {
  it('reads the version of a plain and a scoped folder', () => {
    expect(parseStoreVersion('debug@4.4.3')).toBe('4.4.3');
    expect(parseStoreVersion('@ts-morph+common@0.29.0')).toBe('0.29.0');
  });

  it('drops pnpm peer suffixes', () => {
    expect(
      parseStoreVersion('react-router@8.0.1_react-dom@19.2.4_react@19.2.4'),
    ).toBe('8.0.1');
  });

  it('is undefined without a version', () => {
    expect(parseStoreVersion('plain')).toBeUndefined();
  });
});

describe('parseStoreFilePath', () => {
  it('splits a file into package key and inner path', () => {
    const result = parseStoreFilePath(
      'node_modules/.pnpm/@scope+pkg@1.2.3_peer@1/node_modules/@scope/pkg/lib/a.js',
    );

    expect(result).toEqual({
      ok: true,
      value: {
        key: '@scope/pkg@1.2.3',
        name: '@scope/pkg',
        rest: 'lib/a.js',
        version: '1.2.3',
      },
    });
  });

  it('rejects a path outside the store', () => {
    expect(parseStoreFilePath('applications/x/out/main.js').ok).toBe(false);
  });
});

describe('parseStoreDirPath', () => {
  it('parses a package folder', () => {
    const result = parseStoreDirPath(
      'node_modules/.pnpm/ms@2.0.0/node_modules/ms',
    );

    expect(result).toMatchObject({ ok: true, value: { key: 'ms@2.0.0' } });
  });
});

describe('parseStoreOwner', () => {
  it('names the owner of a dependency link from the store folder, not the link', () => {
    const result = parseStoreOwner(
      'node_modules/.pnpm/qs@6.17.1/node_modules/side-channel',
    );

    expect(result).toMatchObject({ ok: true, value: { key: 'qs@6.17.1' } });
  });

  it('restores a scoped owner name', () => {
    const result = parseStoreOwner(
      'node_modules/.pnpm/@ts-morph+common@0.29.0/node_modules/minimatch',
    );

    expect(result).toMatchObject({
      ok: true,
      value: { name: '@ts-morph/common' },
    });
  });
});
