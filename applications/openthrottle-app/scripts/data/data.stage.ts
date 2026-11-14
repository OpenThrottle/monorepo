/** Where the staged app directory goes; a declared Nx output of `package`. */
export const STAGE_DIR = 'dist/stage';

/** Folders of the staged app, relative to {@link STAGE_DIR}. */
export const STAGE_DEVELOPER_DIR = 'developer';
export const STAGE_OUT_DIR = 'out';

/** electron-vite bundles copied into the stage, relative to the project root. */
export const OUT_BUNDLE_DIRS = ['main', 'preload', 'renderer'] as const;

/** The developer build folders the embedded server needs. */
export const DEVELOPER_BUILD_DIRS = ['client', 'server'] as const;

/**
 * Basenames that are never copied into the stage. `.env` files carry local
 * secrets; the rest are repository metadata and placeholders.
 */
export const EXCLUDED_BASENAMES = [
  '.DS_Store',
  '.gitkeep',
  '.npmrc',
  '.yarnrc',
] as const;

/** A basename that is exactly `.env` or starts with `.env.` is excluded. */
export const ENV_FILE_PREFIX = '.env';

/** Extensions never shipped from a dependency (source maps only bloat it). */
export const EXCLUDED_EXTENSIONS = ['.map'] as const;

/** Extensions that mark a native or platform binary, which asar cannot execute. */
export const NATIVE_EXTENSIONS = [
  '.dll',
  '.dylib',
  '.exe',
  '.node',
  '.so',
] as const;

/** Script extensions that are not native even when the executable bit is set. */
export const SCRIPT_EXTENSIONS = [
  '.cjs',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
] as const;

/**
 * Traced paths that belong to the apps themselves, not to a dependency: the
 * stage copies `out/` and the developer `build/` as folders. (Dependency
 * symlinks are handled as links, see `isPackageLinkPath`.)
 */
export const IGNORED_TRACED_PATTERNS = [
  /^applications\/[^/]+\/out\//u,
  /^applications\/[^/]+\/build\//u,
  /^applications\/[^/]+\/package\.json$/u,
] as const;

/**
 * Packages a traced dependency loads at runtime by a computed name, which the
 * tracer cannot follow. `@vscode/ripgrep` resolves its binary as
 * `@vscode/ripgrep-<platform>-<arch>/bin/rg` (an optionalDependency) and THROWS
 * at import when it is missing, which takes down every IDE route. `{target}`
 * is `<platform>-<arch>` of the machine that stages; `files` are copied from
 * the package as resolved next to `dependent` in the pnpm store.
 */
export const RUNTIME_RESOLVED_PACKAGES = [
  {
    dependent: '@vscode/ripgrep',
    files: ['package.json', 'bin/rg'],
    name: '@vscode/ripgrep-{target}',
  },
] as const;

/**
 * Native or executable files the stage is allowed to contain, relative to the
 * stage root; each must also be in `asarUnpack` (electron-builder.yml), since
 * asar cannot execute them. Both macOS ripgrep arches are listed so an x64 or
 * universal build stages cleanly.
 */
export const EXPECTED_NATIVE_FILES: readonly string[] = [
  'node_modules/@vscode/ripgrep-darwin-arm64/bin/rg',
  'node_modules/@vscode/ripgrep-darwin-x64/bin/rg',
];
