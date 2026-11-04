/** Reads the stored conversation id (trimmed), or null when absent or storage is unavailable. */
export const readConversationIdFromStorage = (key: string): string | null => {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const value = sessionStorage.getItem(key);
    return value && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
};

/** Stores the conversation id; swallows storage failures (the id stays in memory only). */
export const writeConversationIdToStorage = (key: string, id: string): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(key, id);
  } catch {
    // Quota or private browsing — conversation id stays in memory only.
  }
};

/** Clears the stored conversation id; ignores storage failures. */
export const clearConversationIdFromStorage = (key: string): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};
