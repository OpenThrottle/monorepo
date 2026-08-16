import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PAGINATION_CONFIG } from '../../config/pagination';
import { OpenThrottlePagination } from '../OpenThrottlePagination';
import type { OpenThrottlePaginationProps } from '../OpenThrottlePagination';

function renderPagination(props: OpenThrottlePaginationProps): RenderResult {
  const Component = () => <OpenThrottlePagination {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

function pageNumberLinks(view: RenderResult): HTMLAnchorElement[] {
  return [...view.container.querySelectorAll('a[href*="page="]')].filter(
    (link): link is HTMLAnchorElement =>
      link instanceof HTMLAnchorElement &&
      /^\d+$/.test(link.textContent?.trim() ?? ''),
  );
}

describe('OpenThrottlePagination Component', () => {
  describe('when pagination is not needed', () => {
    test('returns null when total fits a single page', () => {
      const view = renderPagination({
        limit: 10,
        page: 1,
        resultLabel: 'projects',
        total: 5,
      });

      expect(view.container.querySelector('nav')).toBeNull();
      expect(view.container.textContent).toBe('');
    });
  });

  describe('summary line', () => {
    test('shows the showing range and result label', () => {
      const view = renderPagination({
        limit: 10,
        page: 2,
        resultLabel: 'plans',
        total: 25,
      });

      expect(view.getByText('Showing 11-20 of 25 plans')).toBeInTheDocument();
    });

    test('uses the supplied label rather than a fixed entity noun', () => {
      const view = renderPagination({
        limit: 10,
        page: 1,
        resultLabel: 'tasks',
        total: 25,
      });

      expect(view.getByText('Showing 1-10 of 25 tasks')).toBeInTheDocument();
      expect(view.queryByText(/projects/)).toBeNull();
    });
  });

  describe('windowed page links', () => {
    test('renders a bounded strip with ellipsis for 100 pages at page 50', () => {
      const view = renderPagination({
        limit: 10,
        page: 50,
        resultLabel: 'projects',
        total: 1000,
      });

      const links = pageNumberLinks(view);
      expect(links.map((link) => link.textContent?.trim())).toEqual([
        '1',
        '49',
        '50',
        '51',
        '100',
      ]);
      expect(
        view.container.querySelectorAll('[data-slot="pagination-ellipsis"]'),
      ).toHaveLength(2);
      expect(links.length).toBeLessThanOrEqual(7);
    });

    test('renders every page when totalPages is at or below the threshold', () => {
      const totalPages = PAGINATION_CONFIG.showAllPagesThreshold;
      const view = renderPagination({
        limit: 10,
        page: 4,
        resultLabel: 'projects',
        total: totalPages * 10,
      });

      const links = pageNumberLinks(view);
      expect(links.map((link) => Number(link.textContent?.trim()))).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ]);
      expect(
        view.container.querySelectorAll('[data-slot="pagination-ellipsis"]'),
      ).toHaveLength(0);
    });
  });

  describe('active page styling', () => {
    test('marks the current page with aria-current page', () => {
      const view = renderPagination({
        limit: 10,
        page: 50,
        resultLabel: 'projects',
        total: 1000,
      });

      const active = view.container.querySelector('[aria-current="page"]');
      expect(active).toBeInTheDocument();
      expect(active).toHaveTextContent('50');
    });
  });

  describe('navigation controls', () => {
    test('disables previous on the first page and links next', () => {
      const view = renderPagination({
        limit: 10,
        page: 1,
        resultLabel: 'projects',
        total: 100,
      });

      expect(
        view.container.querySelector('a[aria-label="Go to previous page"]'),
      ).toBeNull();
      expect(
        view.container.querySelector('a[aria-label="Go to next page"]'),
      ).toHaveAttribute('href', '/projects?page=2&limit=10');
    });

    test('disables next on the last page and links previous', () => {
      const view = renderPagination({
        limit: 10,
        page: 10,
        resultLabel: 'projects',
        total: 100,
      });

      expect(
        view.container.querySelector('a[aria-label="Go to previous page"]'),
      ).toHaveAttribute('href', '/projects?page=9&limit=10');
      expect(
        view.container.querySelector('a[aria-label="Go to next page"]'),
      ).toBeNull();
    });
  });

  describe('URL and filter preservation', () => {
    test('preserves search and sort params in page links', () => {
      const view = renderPagination({
        basePath: '/plans',
        limit: 20,
        page: 3,
        resultLabel: 'projects',
        search: 'auth',
        sortBy: 'title',
        sortOrder: 'asc',
        statuses: ['pending', 'in_progress'],
        total: 200,
      });

      const page50 = pageNumberLinks(view).find(
        (link) => link.textContent?.trim() === '3',
      );
      expect(page50?.getAttribute('href')).toContain('/plans?');
      expect(page50?.getAttribute('href')).toContain('page=3');
      expect(page50?.getAttribute('href')).toContain('limit=20');
      expect(page50?.getAttribute('href')).toContain('q=auth');
      expect(page50?.getAttribute('href')).toContain('sortBy=title');
      expect(page50?.getAttribute('href')).toContain('sortOrder=asc');
      expect(page50?.getAttribute('href')).toContain('status=pending');
      expect(page50?.getAttribute('href')).toContain('status=in_progress');
    });
  });
});
