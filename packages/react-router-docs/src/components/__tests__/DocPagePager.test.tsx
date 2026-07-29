import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DocPagePager } from '../DocPagePager';

const prev = { path: '/docs/getting-started', title: 'Getting Started' };
const next = { path: '/docs/architecture', title: 'Architecture' };

const renderPager = (props: React.ComponentProps<typeof DocPagePager>) =>
  render(
    <MemoryRouter>
      <DocPagePager {...props} />
    </MemoryRouter>,
  );

describe('DocPagePager', () => {
  test('renders both prev and next links', () => {
    const component = renderPager({ next, prev });

    expect(
      component.getByRole('link', { name: /Getting Started/ }),
    ).toHaveAttribute('href', '/docs/getting-started');
    expect(
      component.getByRole('link', { name: /Architecture/ }),
    ).toHaveAttribute('href', '/docs/architecture');
  });

  test('omits the previous link at the first boundary', () => {
    const component = renderPager({ next, prev: null });

    expect(
      component.queryByRole('link', { name: /Getting Started/ }),
    ).not.toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /Architecture/ }),
    ).toBeInTheDocument();
  });

  test('renders nothing when both neighbors are absent', () => {
    const component = renderPager({ next: null, prev: null });

    expect(component.queryByTestId('DocPagePager')).not.toBeInTheDocument();
  });
});
