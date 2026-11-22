import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { ConsentUnavailable } from '../ConsentUnavailable';

describe('ConsentUnavailable', () => {
  test('links to the connected-apps settings page', () => {
    const Stub = createRoutesStub([
      { Component: () => <ConsentUnavailable />, path: '/' },
    ]);
    const component = render(<Stub />);

    expect(component.getByTestId('ConsentUnavailable')).toBeInTheDocument();
    expect(component.getByRole('link')).toHaveAttribute(
      'href',
      '/settings/connections',
    );
  });
});
