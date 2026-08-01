import { formatDate } from 'date-fns';
import type { NoteCardFragment } from '~/__generated__/graphql';

/** First non-empty line of a note (heading markers stripped), truncated to 80. */
export const notePreviewLabel = (content: string): string => {
  const firstLine = content.split('\n')[0]?.trim() ?? '';
  const stripped = firstLine.replace(/^#+\s*/, '').trim();

  if (stripped.length > 0) {
    return stripped.length > 80 ? `${stripped.slice(0, 80)}…` : stripped;
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return 'Untitled note';
  }

  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
};

/** Formats a note's timestamp as MM/dd/yyyy, or "—" when absent/invalid. */
export const formatNoteDate = (raw: NoteCardFragment['updatedAt']): string => {
  if (raw == null) {
    return '—';
  }

  try {
    const date = typeof raw === 'string' ? new Date(raw) : raw;

    return formatDate(date, 'MM/dd/yyyy');
  } catch {
    return '—';
  }
};
