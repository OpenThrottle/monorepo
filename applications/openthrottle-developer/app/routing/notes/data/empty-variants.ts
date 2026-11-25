/** Empty-state copy and call to action, keyed by whether a search is active. */
export const NOTES_EMPTY_VARIANTS = {
  default: {
    cta: 'Create note',
    ctaHref: '/notes/create',
    description: 'Create your first note to get started.',
    title: 'No notes yet',
  },
  search: {
    cta: 'Clear search',
    ctaHref: '/notes',
    description: 'Try clearing the search to see all notes.',
    title: 'No notes match your search',
  },
} as const;
