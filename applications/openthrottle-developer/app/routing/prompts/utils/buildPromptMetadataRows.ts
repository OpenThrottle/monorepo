import type { PromptDetailsFragment } from '~/__generated__/graphql';
import {
  fnv1a32Hex,
  formatIso,
  formatRelativeFromIso,
} from '~/routing/prompts/utils/utils.prompts';

export interface PromptMetadataRow {
  readonly label: string;
  readonly value: string;
}

export interface BuildPromptMetadataRowsInput {
  readonly contentLength: number;
  /** Current editor buffer; may differ from the saved API content. */
  readonly debugContent: string;
  readonly prompt: PromptDetailsFragment;
}

/**
 * @description Rows for the prompt versioning/debug panel. Optional rows
 * (description, saved fingerprint, filePath, projectId, userId) are pushed only
 * when they have something to show.
 */
export const buildPromptMetadataRows = (
  input: BuildPromptMetadataRowsInput,
): PromptMetadataRow[] => {
  const { contentLength, debugContent, prompt } = input;
  const labelsJoined =
    prompt.labels.length > 0 ? prompt.labels.join(', ') : '(none)';
  const rows: PromptMetadataRow[] = [
    { label: 'Prompt ID', value: prompt.id },
    { label: 'promptType', value: String(prompt.promptType) },
    { label: 'Labels', value: labelsJoined },
  ];

  if (prompt.description) {
    rows.push({ label: 'Description', value: prompt.description });
  }

  rows.push(
    { label: 'Created', value: formatIso(prompt.createdAt) },
    {
      label: 'Created (relative)',
      value: formatRelativeFromIso(prompt.createdAt) || '—',
    },
    { label: 'Updated', value: formatIso(prompt.updatedAt) },
    {
      label: 'Updated (relative)',
      value: formatRelativeFromIso(prompt.updatedAt) || '—',
    },
    {
      label: 'Content length',
      value: `${contentLength.toLocaleString()} characters`,
    },
    {
      label: 'Content fingerprint (FNV-1a)',
      value: fnv1a32Hex(debugContent),
    },
  );

  if (debugContent !== prompt.content) {
    rows.push({
      label: 'Saved fingerprint (API)',
      value: fnv1a32Hex(prompt.content),
    });
  }

  if (prompt.filePath) {
    rows.push({ label: 'filePath (repo)', value: prompt.filePath });
  }

  if (prompt.projectId) {
    rows.push({ label: 'projectId', value: prompt.projectId });
  }

  if (prompt.userId) {
    rows.push({ label: 'userId', value: prompt.userId });
  }

  return rows;
};
