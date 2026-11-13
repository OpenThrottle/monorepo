/**
 * @description How many fragments one page of the child picker lists.
 */
export const FRAGMENT_CHILD_PAGE_SIZE = 25;

/**
 * @description The search params the child picker reads its filter and page from, so a filtered
 * page is a link and survives the action's revalidation.
 */
export const FRAGMENT_CHILD_SEARCH_PARAMS = {
  page: 'childPage',
  typename: 'childTypename',
} as const;

/**
 * @description The child picker's "every type" filter option. Radix `Select` reserves the empty
 * string, so "no filter" needs a value of its own; it never reaches the URL.
 */
export const FRAGMENT_CHILD_ALL_TYPENAMES = '__all__';
