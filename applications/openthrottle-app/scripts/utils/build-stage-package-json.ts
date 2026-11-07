export interface AppManifest {
  readonly author: unknown;
  readonly description: string;
  readonly license: string;
  readonly version: string;
}

export interface StagePackageJson {
  readonly author: unknown;
  /** The top-level staged packages, exact versions. */
  readonly dependencies: Readonly<Record<string, string>>;
  readonly description: string;
  /** Only `electron`, so electron-builder can read the version it packages. */
  readonly devDependencies: Readonly<Record<string, string>>;
  readonly license: string;
  readonly main: string;
  readonly name: string;
  /** `traversal` makes electron-builder walk the real stage `node_modules`. */
  readonly packageManager: 'traversal@1.0.0';
  readonly private: true;
  readonly productName: string;
  readonly type: 'module';
  readonly version: string;
}

/**
 * @description The `package.json` electron-builder packages. `dependencies`
 * lists exactly the staged top-level packages and `packageManager` is
 * `traversal`, so electron-builder walks the real, flat stage `node_modules`
 * instead of running pnpm against it (which finds nothing there, falls back to
 * the project's own dependencies and ships the wrong closure). There are no
 * `devDependencies` besides `electron` itself (its version only, nothing
 * is installed from it) and no scripts.
 */
export const buildStagePackageJson = (
  manifest: AppManifest,
  dependencies: Readonly<Record<string, string>>,
  electronVersion: string,
): StagePackageJson => {
  return {
    author: manifest.author,
    dependencies,
    description: manifest.description,
    devDependencies: { electron: electronVersion },
    license: manifest.license,
    main: './out/main/main.js',
    name: 'openthrottle',
    packageManager: 'traversal@1.0.0',
    private: true,
    productName: 'OpenThrottle',
    type: 'module',
    version: manifest.version,
  };
};
