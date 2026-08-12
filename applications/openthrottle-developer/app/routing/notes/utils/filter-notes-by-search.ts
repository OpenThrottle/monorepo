import type { NoteCardFragment } from '~/__generated__/graphql';

/** Client-side filter until the notes list supports server-side search. */
export const filterNotesBySearch = (
  notes: NoteCardFragment[],
  search: string,
): NoteCardFragment[] => {
  const q = search.trim().toLowerCase();

  if (q.length === 0) {
    return notes;
  }

  return notes.filter((note) => {
    const content = note.content.toLowerCase();
    const author = note.author?.trim().toLowerCase() ?? '';

    return content.includes(q) || author.includes(q);
  });
};
