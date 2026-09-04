import { fnv1a32Hex } from '~/routing/prompts/utils/utils.prompts';
import type { PromptDetailsFragment } from '~/__generated__/graphql';

/**
 * @description JSON snapshot for support / diff tools; keys are alphabetized
 * for stable copy-paste. Hoisted out of PromptDetailMetadataPanel per
 * component-primitive-shape R4.
 */
export function buildPromptDebugSnapshotJson(
  prompt: PromptDetailsFragment,
  debugContent: string,
): string {
  const bufferFp = fnv1a32Hex(debugContent);
  const savedFp = fnv1a32Hex(prompt.content);
  return JSON.stringify(
    {
      contentFingerprint: bufferFp,
      createdAt: prompt.createdAt,
      filePath: prompt.filePath ?? null,
      hasUnsavedEditorBuffer: debugContent !== prompt.content,
      labels: prompt.labels,
      projectId: prompt.projectId ?? null,
      promptId: prompt.id,
      promptType: String(prompt.promptType),
      savedContentFingerprint: savedFp,
      title: prompt.title,
      updatedAt: prompt.updatedAt,
      userId: prompt.userId ?? null,
    },
    null,
    2,
  );
}
