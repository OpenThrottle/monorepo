import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { BlogPageHeaderProps } from '../BlogPageHeader';
import { BlogPageHeader } from '../BlogPageHeader';

const renderHeader = (props: BlogPageHeaderProps): RenderResult => {
  const Wrapped = () => <BlogPageHeader {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('BlogPageHeader Component', () => {
  test('renders the heading, eyebrow and description', () => {
    const component = renderHeader({
      description: 'A lede',
      eyebrow: 'Tag',
      heading: 'Posts tagged Agents',
    });

    expect(
      component.getByRole('heading', { level: 1, name: 'Posts tagged Agents' }),
    ).toBeInTheDocument();
    expect(component.getByText('Tag')).toBeInTheDocument();
    expect(component.getByText('A lede')).toBeInTheDocument();
  });

  test('omits the eyebrow and description when they are empty', () => {
    const component = renderHeader({
      description: null,
      eyebrow: undefined,
      heading: 'Blog',
    });

    expect(
      component.getByTestId('BlogPageHeader').querySelectorAll('p'),
    ).toHaveLength(0);
  });
});
