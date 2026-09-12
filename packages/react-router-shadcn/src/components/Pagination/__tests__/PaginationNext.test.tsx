import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

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
