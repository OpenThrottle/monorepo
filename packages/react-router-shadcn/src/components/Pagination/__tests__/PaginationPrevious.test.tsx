import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createRoutesStub } from 'react-router';
import { PaginationPrevious } from '../PaginationPrevious';

describe('PaginationPrevious', () => {
  test('renders a link with its aria-label', () => {
    const Component = () => <PaginationPrevious href="/page" />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container } = render(<RoutesStub />);
    const link = container.querySelector('a[aria-label="Go to previous page"]');
    expect(link).toBeInTheDocument();
  });
});
