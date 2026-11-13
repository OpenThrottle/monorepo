/**
 * @description Defensive read of a task row's `requirementsJson`: a string holding a JSON array of
 * strings yields its non-blank entries; anything else yields no criteria.
 * @public
 */
export const parseRequirements = (value: unknown): readonly string[] => {
  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is string =>
        typeof entry === 'string' && entry.trim().length > 0,
    );
  } catch {
    return [];
  }
};
