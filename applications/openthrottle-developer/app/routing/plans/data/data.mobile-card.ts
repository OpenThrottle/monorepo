/**
 * @description Tailwind class sets that turn the plans and plan-tasks tables
 * into stacked cards below the `sm` breakpoint while keeping a single DOM (one
 * set of cell instances, so keyed fetchers and test selectors are unaffected).
 *
 * The table, `tbody` and each row switch to block/flex layout; the details cell
 * (second `td`) becomes `display: contents` so its title, meta, tags and
 * description are laid out as flex items of the row and can be re-ordered with
 * `order-*` around the status badge (first `td`). The actions cell (third `td`)
 * is pinned to the card's top-right corner. At `sm` and above none of these
 * classes apply, so the desktop table renders exactly as before.
 */

/** Applied to the `<table>` via `DataTable`'s `className`. */
export const MOBILE_CARD_TABLE_CLASS =
  'max-sm:block max-sm:[&_tbody]:block max-sm:[&_thead]:hidden';

/** Applied to each body row via `DataTable`'s `getRowProps`. */
export const MOBILE_CARD_ROW_CLASS = [
  'max-sm:relative max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-2 max-sm:gap-y-1.5 max-sm:p-3',
  'max-sm:[&>td]:p-0',
  'max-sm:[&>td:nth-child(1)]:order-2',
  'max-sm:[&>td:nth-child(2)]:contents',
  'max-sm:[&>td:nth-child(3)]:absolute max-sm:[&>td:nth-child(3)]:top-2 max-sm:[&>td:nth-child(3)]:right-2',
].join(' ');

/** Title row: first, full width, clear of the pinned actions menu. */
export const MOBILE_CARD_TITLE_CLASS =
  'max-sm:order-1 max-sm:w-full max-sm:min-w-0 max-sm:pr-9';

/** Full-width block that follows the status line (tags, description, meta). */
export const MOBILE_CARD_BLOCK_CLASS = {
  description: 'max-sm:order-5 max-sm:w-full max-sm:min-w-0',
  meta: 'max-sm:order-3 max-sm:mt-0 max-sm:w-full max-sm:min-w-0',
  tags: 'max-sm:order-4 max-sm:w-full max-sm:min-w-0',
} as const;
