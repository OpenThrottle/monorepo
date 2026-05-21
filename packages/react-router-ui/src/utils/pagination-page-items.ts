import { PAGINATION_CONFIG } from '../config/pagination';

export type PaginationPageItem =
  | { readonly type: 'page'; readonly page: number }
  | { readonly type: 'ellipsis' };

export interface BuildPaginationPageItemsOptions {
  readonly page: number;
  readonly siblingCount?: number;
  readonly showAllPagesThreshold?: number;
  readonly totalPages: number;
}

/**
 * @description Builds windowed page numbers and ellipsis markers for pagination controls.
 */
export function buildPaginationPageItems(
  options: BuildPaginationPageItemsOptions,
): readonly PaginationPageItem[] {
  const {
    page,
    totalPages,
    siblingCount = PAGINATION_CONFIG.siblingCount,
    showAllPagesThreshold = PAGINATION_CONFIG.showAllPagesThreshold,
  } = options;

  if (totalPages <= 0) {
    return [];
  }

  const currentPage = Math.min(Math.max(1, page), totalPages);

  if (totalPages <= showAllPagesThreshold) {
    return Array.from({ length: totalPages }, (_, index) => ({
      page: index + 1,
      type: 'page' as const,
    }));
  }

  const pageNumbers = new Set<number>([1, totalPages]);

  for (let offset = -siblingCount; offset <= siblingCount; offset += 1) {
    const siblingPage = currentPage + offset;
    if (siblingPage >= 1 && siblingPage <= totalPages) {
      pageNumbers.add(siblingPage);
    }
  }

  const sortedPages = [...pageNumbers].sort((a, b) => a - b);
  const items: PaginationPageItem[] = [];

  for (let index = 0; index < sortedPages.length; index += 1) {
    const pageNumber = sortedPages[index];
    if (pageNumber === undefined) {
      continue;
    }

    if (index > 0) {
      const previousPage = sortedPages[index - 1];
      if (previousPage !== undefined && pageNumber - previousPage >= 2) {
        items.push({ type: 'ellipsis' });
      }
    }

    items.push({ page: pageNumber, type: 'page' });
  }

  return items;
}
