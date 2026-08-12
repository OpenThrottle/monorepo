import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createRoutesStub } from 'react-router';
import { PaginationNext } from '../PaginationNext';

describe('PaginationNext', () => {
  test('renders a link with its aria-label', () => {
    const Component = () => <PaginationNext href="/page" />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container } = render(<RoutesStub />);
    const link = container.querySelector('a[aria-label="Go to next page"]');
    expect(link).toBeInTheDocument();
  });
});
