import { describe, expect, test } from 'vitest';
import { PAGINATION_CONFIG } from '../../config/pagination';
import {
  buildPaginationPageItems,
  type PaginationPageItem,
} from '../pagination-page-items';

function pageNumbers(items: readonly PaginationPageItem[]): number[] {
  return items
    .filter(
      (item): item is Extract<PaginationPageItem, { type: 'page' }> =>
        item.type === 'page',
    )
    .map((item) => item.page);
}

function ellipsisCount(items: readonly PaginationPageItem[]): number {
  return items.filter((item) => item.type === 'ellipsis').length;
}

describe('buildPaginationPageItems', () => {
  describe('when totalPages is at or below showAllPagesThreshold', () => {
    test('returns every page with no ellipsis for few pages', () => {
      const items = buildPaginationPageItems({
        page: 2,
        totalPages: 5,
      });

      expect(pageNumbers(items)).toEqual([1, 2, 3, 4, 5]);
      expect(ellipsisCount(items)).toBe(0);
    });

    test('returns all pages at the threshold boundary', () => {
      const items = buildPaginationPageItems({
        page: 4,
        totalPages: PAGINATION_CONFIG.showAllPagesThreshold,
      });

      expect(pageNumbers(items)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(ellipsisCount(items)).toBe(0);
    });
  });

  describe('when totalPages exceeds showAllPagesThreshold', () => {
    test('shows first, last, and a window around the current page in the middle', () => {
      const items = buildPaginationPageItems({
        page: 50,
        totalPages: 100,
      });

      expect(pageNumbers(items)).toEqual([1, 49, 50, 51, 100]);
      expect(ellipsisCount(items)).toBe(2);
    });

    test('shows leading pages and last when on the first page', () => {
      const items = buildPaginationPageItems({
        page: 1,
        totalPages: 100,
      });

      expect(pageNumbers(items)).toEqual([1, 2, 100]);
      expect(ellipsisCount(items)).toBe(1);
    });

    test('shows first and trailing pages when on the last page', () => {
      const items = buildPaginationPageItems({
        page: 100,
        totalPages: 100,
      });

      expect(pageNumbers(items)).toEqual([1, 99, 100]);
      expect(ellipsisCount(items)).toBe(1);
    });

    test('bounds control size for large totals', () => {
      const items = buildPaginationPageItems({
        page: 50,
        totalPages: 500,
      });

      expect(items.length).toBeLessThanOrEqual(7);
      expect(pageNumbers(items)).toEqual([1, 49, 50, 51, 500]);
    });

    test('does not duplicate ellipsis when pages are adjacent after the window', () => {
      const items = buildPaginationPageItems({
        page: 2,
        totalPages: 10,
      });

      expect(pageNumbers(items)).toEqual([1, 2, 3, 10]);
      expect(ellipsisCount(items)).toBe(1);
    });
  });

  describe('page clamping', () => {
    test('clamps page below 1 to the first page', () => {
      const items = buildPaginationPageItems({
        page: 0,
        totalPages: 100,
      });

      expect(pageNumbers(items)).toEqual([1, 2, 100]);
    });

    test('clamps page above totalPages to the last page', () => {
      const items = buildPaginationPageItems({
        page: 200,
        totalPages: 100,
      });

      expect(pageNumbers(items)).toEqual([1, 99, 100]);
    });
  });

  describe('custom window options', () => {
    test('respects siblingCount and showAllPagesThreshold overrides', () => {
      const items = buildPaginationPageItems({
        page: 10,
        showAllPagesThreshold: 5,
        siblingCount: 2,
        totalPages: 20,
      });

      expect(pageNumbers(items)).toEqual([1, 8, 9, 10, 11, 12, 20]);
      expect(ellipsisCount(items)).toBe(2);
    });
  });
});
