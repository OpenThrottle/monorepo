import type { RulePreviewQuery } from '~/__generated__/graphql';

/** The rule preview as the dry-run query returns it. */
export type RulePreviewData = NonNullable<
  RulePreviewQuery['previewTagActionRule']
>;

/** One plan's per-condition verdicts in the preview's non-matching sample. */
export type RulePreviewNonMatch = RulePreviewData['nonMatching'][number];

/** What the preview resource route (and the detail loader) hands the UI. */
export type RulePreviewState =
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly preview: RulePreviewData };

/** The attach-prompt slice of the form state, handed to the section as one prop. */
export interface RuleFormAttachPromptState {
  /** File path of a legacy reference, shown as "not available" until re-pointed. */
  readonly filePath: string;
  readonly onPlacementChange: (placement: string) => void;
  readonly onPromptChange: (promptId: string, promptType: string) => void;
  readonly placement: string;
  readonly promptId: string;
}
