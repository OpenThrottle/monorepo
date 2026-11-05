type MaybeText = string | null | undefined;

const labelled = (label: string, value: MaybeText): string | null => {
  if (value != null && value !== '') {
    return `${label}: ${value}`;
  }

  return null;
};

const joinPresent = (parts: readonly (string | null)[]): string => {
  return parts.filter(Boolean).join(' · ');
};

/** Explains where the similarity score came from, or why there is none. */
export const describeSimilarity = (
  similarity: number | null | undefined,
): string => {
  if (similarity != null) {
    return `Cosine similarity to your query embedding is about ${Math.round(similarity * 100)}% (higher means closer in vector space).`;
  }

  return 'Ranked by semantic similarity between your query and indexed chunks.';
};

/** Explains which kind of chunk a hit came from. */
export const describeSource = (source: string): string => {
  if (source === 'documentation') {
    return 'This hit came from ingested documentation.';
  }
  if (source === 'task') {
    return 'This hit matches text from a task linked to a plan.';
  }

  return 'This hit matches text from a plan chunk.';
};

/** `Plan id: … · Task id: …`, skipping whichever id is missing. */
export const formatEntityIds = (
  planId: MaybeText,
  taskId: MaybeText,
): string => {
  return joinPresent([
    labelled('Plan id', planId),
    labelled('Task id', taskId),
  ]);
};

/** `Repo: … · Path: … · SHA: …` (short SHA), skipping whatever is missing. */
export const formatDocSourceMeta = (
  repo: MaybeText,
  path: MaybeText,
  sha: MaybeText,
): string => {
  return joinPresent([
    labelled('Repo', repo),
    labelled('Path', path),
    labelled('SHA', sha?.slice(0, 7)),
  ]);
};
