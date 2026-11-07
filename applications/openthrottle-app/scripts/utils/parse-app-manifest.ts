import type { AppManifest } from './build-stage-package-json.ts';

export type ParseAppManifestResult =
  | { readonly manifest: AppManifest; readonly ok: true }
  | { readonly ok: false; readonly reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/** @description Narrows the parsed app `package.json` to the fields the stage copies. */
export const parseAppManifest = (value: unknown): ParseAppManifestResult => {
  if (!isRecord(value)) {
    return { ok: false, reason: 'package.json is not an object' };
  }

  const { author, description, license, version } = value;

  if (
    typeof description !== 'string' ||
    typeof license !== 'string' ||
    typeof version !== 'string'
  ) {
    return {
      ok: false,
      reason: 'package.json needs string description, license and version',
    };
  }

  return { manifest: { author, description, license, version }, ok: true };
};
