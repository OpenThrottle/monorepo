import {
  FRAGMENT_CHILD_PAGE_SIZE,
  FRAGMENT_CHILD_SEARCH_PARAMS,
} from '~/routing/fragments/data/data.children';
import type { FragmentChildPickerQuery } from '~/routing/fragments/types/fragment-children';

/**
 * @description The picker's filter and page from the URL. A missing, negative or non-integer
 * page is the first page; a blank typename is no filter.
 */
export const readChildPickerQuery = (
  searchParams: URLSearchParams,
): FragmentChildPickerQuery => {
  const rawPage = Number(searchParams.get(FRAGMENT_CHILD_SEARCH_PARAMS.page));
  const rawTypename = searchParams.get(FRAGMENT_CHILD_SEARCH_PARAMS.typename);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const typename = rawTypename?.trim() ? rawTypename.trim() : null;

  return { page, typename };
};

/**
 * @description The `skip`/`take` for one picker page.
 */
export const toChildPickerPaging = (
  query: FragmentChildPickerQuery,
): { readonly skip: number; readonly take: number } => {
  return {
    skip: query.page * FRAGMENT_CHILD_PAGE_SIZE,
    take: FRAGMENT_CHILD_PAGE_SIZE,
  };
};

/**
 * @description The search string for a picker page, keeping every other param in `search`.
 */
export const getChildPickerSearch = (
  search: string,
  query: FragmentChildPickerQuery,
): string => {
  const params = new URLSearchParams(search);

  if (query.page > 0) {
    params.set(FRAGMENT_CHILD_SEARCH_PARAMS.page, String(query.page));
  } else {
    params.delete(FRAGMENT_CHILD_SEARCH_PARAMS.page);
  }

  if (query.typename) {
    params.set(FRAGMENT_CHILD_SEARCH_PARAMS.typename, query.typename);
  } else {
    params.delete(FRAGMENT_CHILD_SEARCH_PARAMS.typename);
  }

  const value = params.toString();

  return value === '' ? '' : `?${value}`;
};

/**
 * @description The distinct typenames in `schemas`, sorted.
 */
export const toChildTypenames = (
  schemas: readonly { readonly typename: string }[],
): readonly string[] => {
  return [...new Set(schemas.map((schema) => schema.typename))].sort();
};
