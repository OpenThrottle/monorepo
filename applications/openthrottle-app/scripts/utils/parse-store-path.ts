const STORE_PREFIX = String.raw`(?:^|/)node_modules/\.pnpm/([^/]+)/node_modules/((?:@[^/]+/)?[^/]+)`;
const STORE_FILE = new RegExp(`${STORE_PREFIX}/(.+)$`, 'u');
const STORE_DIR = new RegExp(`${STORE_PREFIX}$`, 'u');

export interface StorePackage {
  /** `<name>@<version>`: pnpm peer-suffix variants of one version share it. */
  readonly key: string;
  readonly name: string;
  readonly version: string;
}

export interface StoreFile extends StorePackage {
  /** Path inside the package. */
  readonly rest: string;
}

export type ParseStoreResult<TValue> =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly value: TValue };

/**
 * @description pnpm store folders are `<name>@<version>` (a `/` in the name is
 * `+`), optionally followed by `_<peer>@<version>` suffixes. Returns the
 * version, or `undefined` for a folder that does not match.
 *
 * @public Exported so its spec can pin the parsing rules directly.
 */
export const parseStoreVersion = (storeId: string): string | undefined => {
  const at = storeId.indexOf('@', 1);

  if (at === -1) {
    return undefined;
  }

  const [version] = storeId.slice(at + 1).split('_');

  return version === undefined || version === '' ? undefined : version;
};

const toPackage = (
  storeId: string,
  name: string,
): ParseStoreResult<StorePackage> => {
  const version = parseStoreVersion(storeId);

  if (version === undefined) {
    return { ok: false, reason: `no version in pnpm folder "${storeId}"` };
  }

  return { ok: true, value: { key: `${name}@${version}`, name, version } };
};

/**
 * @description Parses a file inside pnpm's virtual store
 * (`node_modules/.pnpm/<id>/node_modules/<name>/<rest>`).
 */
export const parseStoreFilePath = (
  path: string,
): ParseStoreResult<StoreFile> => {
  const [, storeId, name, rest] = STORE_FILE.exec(path) ?? [];

  if (storeId === undefined || name === undefined || rest === undefined) {
    return { ok: false, reason: `not a file in node_modules/.pnpm: ${path}` };
  }

  const parsed = toPackage(storeId, name);

  return parsed.ok ? { ok: true, value: { ...parsed.value, rest } } : parsed;
};

/**
 * @description Parses a package folder in the store
 * (`node_modules/.pnpm/<id>/node_modules/<name>`), the target of a dependency
 * link.
 */
export const parseStoreDirPath = (
  path: string,
): ParseStoreResult<StorePackage> => {
  const [, storeId, name] = STORE_DIR.exec(path) ?? [];

  if (storeId === undefined || name === undefined) {
    return {
      ok: false,
      reason: `not a package in node_modules/.pnpm: ${path}`,
    };
  }

  return toPackage(storeId, name);
};

const STORE_OWNER = /(?:^|\/)node_modules\/\.pnpm\/([^/]+)\/node_modules\//u;

/**
 * @description The package that OWNS a store folder, read from the folder name
 * itself (`@scope+name@1.0.0_peer@2` is `@scope/name@1.0.0`). A dependency link
 * lives inside its owner's folder, so this identifies who depends on it.
 */
export const parseStoreOwner = (
  path: string,
): ParseStoreResult<StorePackage> => {
  const [, storeId] = STORE_OWNER.exec(path) ?? [];

  if (storeId === undefined) {
    return {
      ok: false,
      reason: `not inside a node_modules/.pnpm folder: ${path}`,
    };
  }

  const at = storeId.indexOf('@', 1);

  if (at === -1) {
    return { ok: false, reason: `no version in pnpm folder "${storeId}"` };
  }

  return toPackage(storeId, storeId.slice(0, at).replace('+', '/'));
};
