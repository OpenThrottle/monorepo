/**
 * @description Factory function for creating CustomPrompt test fixtures.
 */

import type { CustomPromptType } from './custom-prompt.entity';

export interface CustomPromptFactoryData {
  readonly content?: string;
  readonly description?: string | null;
  readonly filePath?: string | null;
  readonly labels?: string[];
  readonly projectId?: string | null;
  readonly promptType?: CustomPromptType;
  readonly title?: string;
  readonly userId?: string | null;
}

let counter = 0;

export function customPromptsFactory(
  overrides: CustomPromptFactoryData = {},
): CustomPromptFactoryData & {
  readonly content: string;
  readonly description: string | null;
  readonly filePath: string | null;
  readonly labels: string[];
  readonly projectId: string | null;
  readonly promptType: CustomPromptType;
  readonly title: string;
  readonly userId: string | null;
} {
  counter += 1;

  return {
    content: overrides.content ?? `# Custom Prompt ${counter}\n\nContent here.`,
    description: overrides.description ?? null,
    filePath: overrides.filePath ?? null,
    labels: overrides.labels ?? [],
    projectId: overrides.projectId ?? null,
    promptType: overrides.promptType ?? 'prompts',
    title: overrides.title ?? `Custom Prompt ${counter}`,
    userId: overrides.userId ?? null,
  };
}
