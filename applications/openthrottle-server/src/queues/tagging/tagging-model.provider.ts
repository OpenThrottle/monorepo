/**
 * @description The TaggingModelProvider seam: closed-vocabulary classification
 * of plan/task text (or a landed diff) into `{ tag, dimension, confidence }`
 * predictions. Implementations: hosted small model (default), local Ollama,
 * a deterministic keyword stub (offline dev / E2E), and disabled. The
 * processor — not the provider — enforces vocabulary membership and the
 * 0–5 domain / ≤1 phase caps, so providers stay dumb text→JSON functions.
 */

import { z } from 'zod';

/** Injection token for the configured {@link TaggingModelProvider}. */
export const TAGGING_MODEL_PROVIDER_TOKEN = 'TAGGING_MODEL_PROVIDER';

export interface TaggingClassificationInput {
  readonly description: string | null;
  /** Optional diff excerpt (refine-tagging). */
  readonly diff?: string;
  readonly summary: string | null;
  readonly title: string;
}

export interface TaggingVocabularyEntry {
  readonly dimension: string;
  readonly tag: string;
}

export interface TaggingPrediction {
  readonly confidence: number;
  readonly dimension: string;
  readonly tag: string;
}

export interface TaggingModelProvider {
  classify(
    input: TaggingClassificationInput,
    vocabulary: readonly TaggingVocabularyEntry[],
  ): Promise<TaggingPrediction[]>;
  /** Human-readable provider name for logs. */
  readonly name: string;
}

/** Strict schema for the model's JSON response. */
export const taggingModelResponseSchema = z
  .object({
    tags: z
      .array(
        z
          .object({
            confidence: z.number().min(0).max(1).default(0.5),
            dimension: z.enum(['domain', 'phase']),
            tag: z.string().min(1),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();

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
