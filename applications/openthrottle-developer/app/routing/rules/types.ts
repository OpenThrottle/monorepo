import type { RulePreviewFragment } from '~/__generated__/graphql';

/** What the preview resource route (and the detail loader) hands the UI. */
export type RulePreviewState =
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly preview: RulePreviewFragment };

/** The attach-prompt slice of the form state, handed to the section as one prop. */
export interface RuleFormAttachPromptState {
  /** File path of a legacy reference, shown as "not available" until re-pointed. */
  readonly filePath: string;
  readonly onPlacementChange: (placement: string) => void;
  readonly onPromptChange: (promptId: string, promptType: string) => void;
  readonly placement: string;
  readonly promptId: string;
}
