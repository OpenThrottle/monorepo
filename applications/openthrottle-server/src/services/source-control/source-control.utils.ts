import { DEFAULT_FORGE_KIND, FORGE_KIND } from './source-control.constants.ts';
import type { ForgeKind, ForgeRepoRef } from './source-control.types.ts';

/** @description True when `value` names a known forge. */
export function isForgeKind(value: unknown): value is ForgeKind {
  return Object.values(FORGE_KIND).some((kind) => kind === value);
}

/**
 * @description The forge an artifact payload's `forge` field names. Absent (every row written before
 * the forge abstraction) means {@link DEFAULT_FORGE_KIND}; anything present but unknown is null, so a
 * caller skips the row rather than asking the wrong forge about it.
 */
export function forgeKindOfPayload(
  payload: Readonly<Record<string, unknown>>,
): ForgeKind | null {
  const forge = payload.forge;

  if (forge === undefined || forge === null) return DEFAULT_FORGE_KIND;

  return isForgeKind(forge) ? forge : null;
}

/**
 * @description The payload fields that name a repo: `repo`, plus `forge` only when it is not the
 * default. Omitting the default keeps a GitHub row byte-identical to every row written before forges
 * existed, so its external key and any dedupe against it are unchanged.
 */
export function repoPayloadFields(ref: ForgeRepoRef): {
  readonly forge?: ForgeKind;
  readonly repo: string;
} {
  if (ref.forge === DEFAULT_FORGE_KIND) return { repo: ref.fullName };

  return { forge: ref.forge, repo: ref.fullName };
}

/**
 * @description Split a `fullName` into the owner (everything before the last `/`) and the repo name.
 * GitHub has exactly one `/`; GitLab nests groups, so the owner may itself contain slashes. null for
 * anything without both halves.
 */
export function splitFullName(
  fullName: unknown,
): { readonly name: string; readonly owner: string } | null {
  if (typeof fullName !== 'string') return null;

  const slash = fullName.lastIndexOf('/');

  if (slash <= 0 || slash === fullName.length - 1) return null;

  return { name: fullName.slice(slash + 1), owner: fullName.slice(0, slash) };
}

/**
 * @description Resolve a git remote (normalized `https://host/path`, raw `https://…`, `git@host:path`
 * or `ssh://…`) to a repo on a known forge, looked up by host in `hosts`. null for a remote on an
 * unknown host, or one without an `owner/name` path.
 */
export function parseForgeRemote(
  url: string | null,
  hosts: Readonly<Record<string, ForgeKind>>,
): ForgeRepoRef | null {
  if (url == null) return null;

  const match =
    /^(?:[a-z+]+:\/\/)?(?:[^@/]+@)?([^/:]+)(?::\d+)?[/:](.+?)(?:\.git)?\/?$/i.exec(
      url.trim(),
    );

  if (match == null) return null;

  const host = match[1]?.toLowerCase();
  const path = match[2];

  if (host === undefined || path === undefined) return null;

  const forge = hosts[host];

  if (forge === undefined || splitFullName(path) == null) return null;

  return { forge, fullName: path };
}
