import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { default as ComposeRoute } from '../_layout.mail.compose';

describe('routes/_layout.mail.compose.tsx', () => {
  test('should render ComposeForm', () => {
    const RoutesStub = createRoutesStub([
      {
        Component: (props: any) => <ComposeRoute {...props} />,
        path: '/',
      },
    ]);
    const component = render(<RoutesStub />);
    expect(component.getByTestId('ComposeForm')).toBeInTheDocument();
  });
});
