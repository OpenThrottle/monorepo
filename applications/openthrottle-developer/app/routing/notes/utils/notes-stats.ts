import type { NoteCardFragment } from '~/__generated__/graphql';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface NotesStatsCounts {
  readonly authorCount: number;
  readonly createdLast30Days: number;
  readonly total: number;
  readonly updatedLast7Days: number;
}

/**
 * @description Epoch milliseconds for a GraphQL `DateTime` value (ISO string
 * or `Date`), or `undefined` when it is absent or unparseable.
 */
export const toNoteTime = (raw: unknown): number | undefined => {
  const isDateLike = typeof raw === 'string' || raw instanceof Date;

  if (!isDateLike) {
    return undefined;
  }

  const time = new Date(raw).getTime();

  return Number.isNaN(time) ? undefined : time;
};

const isWithinDays = (raw: unknown, days: number, now: number): boolean => {
  const time = toNoteTime(raw);

  return time !== undefined && now - time <= days * DAY_MS;
};

/**
 * @description Counts for the notes stats panel. A note never updated falls
 * back to its `createdAt` for the "updated" window. Authors are counted by
 * trimmed name; blank authors are not counted.
 */
export const countNoteStats = (
  notes: readonly NoteCardFragment[],
  now: number,
): NotesStatsCounts => {
  const authors = new Set(
    notes
      .map((note) => note.author?.trim() ?? '')
      .filter((author) => author.length > 0),
  );

  return {
    authorCount: authors.size,
    createdLast30Days: notes.filter((note) => {
      return isWithinDays(note.createdAt, 30, now);
    }).length,
    total: notes.length,
    updatedLast7Days: notes.filter((note) => {
      return isWithinDays(note.updatedAt ?? note.createdAt, 7, now);
    }).length,
  };
};
