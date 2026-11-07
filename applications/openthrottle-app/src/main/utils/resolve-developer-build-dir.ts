import { resolve } from 'node:path';

export interface ResolveDeveloperBuildDirOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly isPackaged: boolean;
  /** Directory of the running main bundle (`out/main`, inside `app.asar` when packaged). */
  readonly mainDir: string;
}

/**
 * @description Where the developer app's `server/` and `client/` build lives.
 * Packaged, it ships inside the app next to `out/` (`developer/`), and the
 * environment can NOT redirect it: an env var must not be able to point a
 * shipped app at other code. Unpackaged, `OPENTHROTTLE_DEVELOPER_BUILD_DIR`
 * overrides the sibling monorepo build (`applications/openthrottle-developer/build`).
 */
export const resolveDeveloperBuildDir = (
  options: ResolveDeveloperBuildDirOptions,
): string => {
  const { env, isPackaged, mainDir } = options;

  if (isPackaged) {
    return resolve(mainDir, '../../developer');
  }

  const override = env['OPENTHROTTLE_DEVELOPER_BUILD_DIR'];

  if (override !== undefined && override !== '') {
    return override;
  }

  return resolve(mainDir, '../../../openthrottle-developer/build');
};
