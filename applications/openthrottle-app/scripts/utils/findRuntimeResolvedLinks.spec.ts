import { findRuntimeResolvedLinks } from './findRuntimeResolvedLinks.ts';

const RIPGREP = {
  dependent: '@vscode/ripgrep',
  files: ['package.json', 'bin/rg'],
  name: '@vscode/ripgrep-{target}',
};

describe('findRuntimeResolvedLinks', () => {
  it('puts the platform package beside the traced dependent', () => {
    const links = findRuntimeResolvedLinks(
      [
        'node_modules/.pnpm/@vscode+ripgrep@1.18.0/node_modules/@vscode/ripgrep/lib/index.js',
        'node_modules/.pnpm/@vscode+ripgrep@1.18.0/node_modules/@vscode/ripgrep/package.json',
      ],
      [RIPGREP],
      'darwin-arm64',
    );

    expect(links).toEqual([
      {
        files: ['package.json', 'bin/rg'],
        link: 'node_modules/.pnpm/@vscode+ripgrep@1.18.0/node_modules/@vscode/ripgrep-darwin-arm64',
      },
    ]);
  });

  it('adds nothing when the dependent was not traced', () => {
    expect(
      findRuntimeResolvedLinks(
        ['node_modules/.pnpm/zod@4.0.0/node_modules/zod/index.js'],
        [RIPGREP],
        'darwin-arm64',
      ),
    ).toEqual([]);
  });

  it('does not match a package whose name only starts with the dependent', () => {
    expect(
      findRuntimeResolvedLinks(
        [
          'node_modules/.pnpm/@vscode+ripgrep-x@1.0.0/node_modules/@vscode/ripgrep-x/index.js',
        ],
        [RIPGREP],
        'darwin-arm64',
      ),
    ).toEqual([]);
  });
});
