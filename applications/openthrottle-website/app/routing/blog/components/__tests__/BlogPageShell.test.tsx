import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { BlogPageShellProps } from '../BlogPageShell';
import { BlogPageShell } from '../BlogPageShell';

const renderShell = (props: BlogPageShellProps): RenderResult => {
  const Wrapped = () => <BlogPageShell {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('BlogPageShell Component', () => {
  test('wraps its children in the main landmark and adds the site footer', () => {
    const component = renderShell({ children: <p>Inside the shell</p> });

    expect(component.getByRole('main')).toContainElement(
      component.getByText('Inside the shell'),
    );
    expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
  });
});
