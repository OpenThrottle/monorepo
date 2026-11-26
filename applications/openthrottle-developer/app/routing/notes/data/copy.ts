/** Labels for the notes stats panel. */
export const NOTES_STATS_COPY = {
  authors: `Authors`,
  createdLast30Days: `Created in 30 days`,
  total: `Total`,
  updatedLast7Days: `Updated in 7 days`,
} as const;

/** Labels for the per-row actions popover in the notes table. */
export const NOTES_ROW_ACTIONS_COPY = {
  deleteAction: `Delete`,
  deleteConfirmCancel: `Cancel`,
  deleteConfirmDescriptionPrefix: `This permanently deletes`,
  deleteConfirmDescriptionSuffix: `. This cannot be undone.`,
  deleteConfirmLabel: `Delete note`,
  deleteConfirmTitle: `Delete this note?`,
  deleteError: `Could not delete the note. Please try again.`,
  editAction: `Edit`,
  menuAriaLabelPrefix: `Actions for`,
  viewAction: `View`,
} as const;
