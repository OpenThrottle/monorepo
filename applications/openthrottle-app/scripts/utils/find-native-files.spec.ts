import { findNativeFiles } from './find-native-files.ts';

describe('findNativeFiles', () => {
  it('finds native modules and libraries by extension', () => {
    const found = findNativeFiles([
      { mode: 0o644, path: 'node_modules/x/build/x.node' },
      { mode: 0o644, path: 'node_modules/y/lib.dylib' },
      { mode: 0o644, path: 'node_modules/z/index.js' },
    ]);

    expect(found).toEqual([
      'node_modules/x/build/x.node',
      'node_modules/y/lib.dylib',
    ]);
  });

  it('finds an executable that is not a script', () => {
    const found = findNativeFiles([
      { mode: 0o755, path: 'node_modules/@vscode/ripgrep/bin/rg' },
      { mode: 0o755, path: 'node_modules/x/cli.js' },
    ]);

    expect(found).toEqual(['node_modules/@vscode/ripgrep/bin/rg']);
  });

  it('is empty for plain data', () => {
    expect(findNativeFiles([{ mode: 0o644, path: 'a.json' }])).toEqual([]);
  });
});
