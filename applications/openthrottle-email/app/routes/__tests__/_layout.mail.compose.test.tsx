import * as React from 'react';
import { act, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { default as ComposeRoute } from '../_layout.mail.compose';

describe('routes/_layout.mail.compose.tsx', () => {
  test('should render ComposeForm', async () => {
    const RoutesStub = createRoutesStub([
      {
        Component: (props: any) => <ComposeRoute {...props} />,
        path: '/',
      },
    ]);
    const component = render(<RoutesStub />);

    // Settle the router stub hydration and ComposeForm's formik
    // `validateOnMount` async update inside act() before asserting.
    await act(async () => {});

    expect(component.getByTestId('ComposeForm')).toBeInTheDocument();
  });
});
