import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Ripgrep globs the semantic code index leaves out on top of `.gitignore`: files that are
 * committed but are not code a person would search for — lockfiles, license texts, generated and
 * minified output, snapshots, line-delimited data dumps, and binary or media files. They crowd code
 * out of the top results; a lockfile is hundreds of chunks, and one data-dump line can be a
 * megabyte.
 *
 * The root `docs/` tree is prose that OpenThrottle already ingests into its documentation search,
 * so it is left out too. Markdown beside the code (a package README, an AGENTS.md) stays in.
 *
 * Text search and the file listing are not affected; this applies to the semantic index only.
 *
 * @public
 */
export const DEFAULT_SEMANTIC_EXCLUDE_GLOBS: readonly string[] = [
  '**/__generated__/**',
  '*.jsonl',
  '*.lock',
  '*.map',
  '*.min.css',
  '*.min.js',
  '*.ndjson',
  '*.snap',
  '*.{7z,gz,jar,tar,tgz,zip}',
  '*.{bmp,gif,icns,ico,jpeg,jpg,png,svg,tif,tiff,webp}',
  '*.{eot,otf,ttf,woff,woff2}',
  '*.{mov,mp3,mp4,wav,webm}',
  '*.{onnx,pdf,wasm}',
  'CHANGELOG.md',
  'COPYING*',
  'LICENCE*',
  'LICENSE*',
  'NOTICE*',
  'THIRD-PARTY-LICENSES*',
  'docs/**',
  'go.sum',
  'npm-shrinkwrap.json',
  'package-lock.json',
  'pnpm-lock.yaml',
];

/** Attributes that mark a path as not hand-written code in GitHub's Linguist. */
const NON_CODE_ATTRIBUTES = new Set([
  'linguist-generated',
  'linguist-generated=true',
  'linguist-vendored',
  'linguist-vendored=true',
]);

/**
 * Paths the workspace's root `.gitattributes` marks `linguist-generated` or `linguist-vendored`,
 * as ripgrep globs. Both use gitignore pattern rules, so a pattern carries over unchanged. A
 * missing or unreadable file yields no globs.
 */
async function gitattributesNonCodeGlobs(root: string): Promise<string[]> {
  let text: string;

  try {
    text = await readFile(join(root, '.gitattributes'), 'utf8');
  } catch {
    return [];
  }

  return text.split('\n').flatMap((line) => {
    const [pattern, ...attributes] = line.trim().split(/\s+/);
    const isPattern =
      pattern !== undefined && pattern !== '' && !pattern.startsWith('#');
    const isNonCode = attributes.some((attribute) => {
      return NON_CODE_ATTRIBUTES.has(attribute);
    });

    return isPattern && isNonCode ? [pattern] : [];
  });
}

/**
 * The exclude globs for semantically indexing the workspace at `root`:
 * {@link DEFAULT_SEMANTIC_EXCLUDE_GLOBS} plus whatever its `.gitattributes` marks generated or
 * vendored. Pass the result as `WorkspaceConfig.exclude` to both `hashWorkspace` and
 * `indexWorkspace`, so a snapshot diff sees the same file set the index does.
 *
 * @public
 */
export async function semanticExcludeGlobs(root: string): Promise<string[]> {
  const fromAttributes = await gitattributesNonCodeGlobs(root);

  return [...DEFAULT_SEMANTIC_EXCLUDE_GLOBS, ...fromAttributes];
}
