import { z } from 'zod/v3';

import { NOTES_DELETE_INTENT } from '~/routing/notes/config/note-actions';

/** The notes index route's action payload: today, only a row delete. */
export const NotesActionFormSchema = z.object({
  id: z.string().min(1),
  intent: z.literal(NOTES_DELETE_INTENT),
});

export type NotesActionFormData = z.infer<typeof NotesActionFormSchema>;
