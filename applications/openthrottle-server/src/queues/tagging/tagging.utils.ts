import { taggingModelResponseSchema } from './tagging.constants.ts';
import type {
  TaggingClassificationInput,
  TaggingPrediction,
  TaggingVocabularyEntry,
} from './tagging.types.ts';
/**
 * @description Builds the shared classification prompt: closed vocabulary,
 * strict JSON output, per-dimension caps.
 */
export const buildTaggingPrompt = (
  input: TaggingClassificationInput,
  vocabulary: readonly TaggingVocabularyEntry[],
): string => {
  const domain = vocabulary
    .filter((entry) => entry.dimension === 'domain')
    .map((entry) => entry.tag);
  const phase = vocabulary
    .filter((entry) => entry.dimension === 'phase')
    .map((entry) => entry.tag);

  const sections = [
    `Classify the following work item against a CLOSED tag vocabulary.`,
    `Domain tags (subject areas, pick 0-5): ${domain.join(', ')}`,
    `Phase tags (lifecycle stage, pick 0-1): ${phase.join(', ')}`,
    `Respond with STRICT JSON only, shaped exactly as {"tags": [{"tag": string, "dimension": "domain"|"phase", "confidence": number 0-1}]}. Never invent tags outside the vocabulary; return {"tags": []} when nothing fits.`,
    `Title: ${input.title}`,
  ];
  if (input.summary != null && input.summary.length > 0) {
    sections.push(`Summary: ${input.summary}`);
  }
  if (input.description != null && input.description.length > 0) {
    sections.push(`Description: ${input.description}`);
  }
  if (input.diff != null && input.diff.length > 0) {
    sections.push(`Landed diff (classify DOMAIN tags only):\n${input.diff}`);
  }
  return sections.join('\n\n');
};

/**
 * @description Parses a model text response into predictions; throws on
 * malformed JSON or schema mismatch (callers retry once, then skip).
 */
export const parseTaggingResponse = (raw: string): TaggingPrediction[] => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('tagging model response contains no JSON object');
  }
  const parsed = taggingModelResponseSchema.parse(
    JSON.parse(raw.slice(start, end + 1)),
  );
  return parsed.tags;
};
const REQUEST_TIMEOUT_MS = 30_000;

export const withOneRetry = async (
  attempt: () => Promise<TaggingPrediction[]>,
): Promise<TaggingPrediction[]> => {
  try {
    return await attempt();
  } catch {
    return attempt();
  }
};

export const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};
