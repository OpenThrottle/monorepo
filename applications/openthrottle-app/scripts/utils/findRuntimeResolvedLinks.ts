export interface RuntimeResolvedPackage {
  /** The traced package that loads {@link RuntimeResolvedPackage.name} at runtime. */
  readonly dependent: string;
  readonly files: readonly string[];
  /** The package name; `{target}` stands for `<platform>-<arch>`. */
  readonly name: string;
}

export interface RuntimeResolvedLink {
  readonly files: readonly string[];
  /** The store symlink beside the dependent, relative to the trace base. */
  readonly link: string;
}

const STORE_DIR = /^(node_modules\/\.pnpm\/[^/]+\/node_modules)\//u;

/**
 * @description For each traced package that loads a sibling by a computed
 * name (e.g. `@vscode/ripgrep` → `@vscode/ripgrep-darwin-arm64`), returns the
 * pnpm store symlink where that sibling sits beside it. The tracer reports
 * the dependent's files but never the sibling, so the stage adds the link and
 * the listed files itself, once per target (a universal build stages both
 * macOS arches). A dependent that was not traced adds nothing.
 */
export const findRuntimeResolvedLinks = (
  traced: readonly string[],
  packages: readonly RuntimeResolvedPackage[],
  targets: readonly string[],
): readonly RuntimeResolvedLink[] => {
  const links = new Map<string, RuntimeResolvedLink>();

  for (const pkg of packages) {
    for (const path of traced) {
      const storeDir = STORE_DIR.exec(path)?.[1];

      if (
        storeDir !== undefined &&
        path.startsWith(`${storeDir}/${pkg.dependent}/`)
      ) {
        for (const target of targets) {
          const link = `${storeDir}/${pkg.name.replace('{target}', target)}`;

          links.set(link, { files: pkg.files, link });
        }
      }
    }
  }

  return [...links.values()].sort((a, b) => a.link.localeCompare(b.link));
};
