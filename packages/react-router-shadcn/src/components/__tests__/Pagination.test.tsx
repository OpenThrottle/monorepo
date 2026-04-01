import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../Pagination';

describe('Pagination Component', () => {
  let component: ReturnType<typeof render>;

  beforeEach(() => {
    const Component = () => (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive={true}>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('should render nav with aria-label pagination', () => {
    const nav = component.container.querySelector(
      'nav[aria-label="pagination"]',
    );
    expect(nav).toBeInTheDocument();
  });

  test('should render PaginationPrevious with aria-label', () => {
    const prev = component.container.querySelector(
      'a[aria-label="Go to previous page"]',
    );
    expect(prev).toBeInTheDocument();
  });

  test('should render PaginationNext with aria-label', () => {
    const next = component.container.querySelector(
      'a[aria-label="Go to next page"]',
    );
    expect(next).toBeInTheDocument();
  });

  test('should render active link with aria-current page', () => {
    const activeLink = component.container.querySelector(
      'a[aria-current="page"]',
    );
    expect(activeLink).toBeInTheDocument();
    expect(activeLink).toHaveTextContent('2');
  });
});
