import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { COPY } from '../../data/data.copy';
import type { LayoutProps } from '../Layout';
import { Layout } from '../Layout';

const renderLayout = (props: LayoutProps): RenderResult => {
  const Component = (): React.ReactElement => {
    return <Layout {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('Layout Component', () => {
  describe('with children', () => {
    test('renders the children inside the wrapper', async () => {
      const component = renderLayout({
        children: <p>Block</p>,
        className: 'grid',
      });
      const block = await component.findByText('Block');

      expect(block.parentElement).toHaveClass('grid');
      expect(component.queryByText(COPY.layout.emptyTitle)).toBeNull();
    });
  });

  describe('without children', () => {
    test('renders the empty state', async () => {
      const component = renderLayout({ children: [], className: undefined });

      expect(
        await component.findByRole('heading', {
          name: COPY.layout.emptyTitle,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByText(COPY.layout.emptyDescription),
      ).toBeInTheDocument();
    });
  });

  test('outlines the block in debug mode', () => {
    expect(Layout.debug.className).toBe('border-pink-500');
  });
});
