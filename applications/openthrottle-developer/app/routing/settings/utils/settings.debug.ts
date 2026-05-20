import { maskSensitiveEnvValue } from '~/routing/settings/utils/sanitize-client-env';

const STORAGE_PREVIEW_MAX = 140;

const summarizeStoragePair = (key: string, raw: string): string => {
  const lower = key.toLowerCase();
  if (
    lower.includes('token') ||
    lower.includes('auth') ||
    lower.includes('secret')
  ) {
    return maskSensitiveEnvValue(key, raw);
  }

  if (raw.length > STORAGE_PREVIEW_MAX) {
    return `${raw.slice(0, STORAGE_PREVIEW_MAX)}…`;
  }

  return raw;
};

export const readStorageEntries = (
  storage: Storage | undefined,
): readonly { readonly key: string; readonly preview: string }[] => {
  if (!storage || typeof storage.length !== 'number') {
    return [];
  }

  const out: { key: string; preview: string }[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);

    if (!key) continue;
    const raw = storage.getItem(key) ?? '';

    out.push({ key, preview: summarizeStoragePair(key, raw) });
  }

  out.sort((a, b) => a.key.localeCompare(b.key));

  return out;
};
