import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { default as Route } from '../_layout.mail.sent';

describe('routes/_layout.mail.sent.tsx', () => {
  test('should render', () => {
    const RoutesStub = createRoutesStub([
      { Component: (props: any) => <Route {...props} />, path: '/' },
    ]);
    const component = render(<RoutesStub />);
    expect(component.getByTestId('MessageList')).toBeInTheDocument();
  });
});
