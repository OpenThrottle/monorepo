import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createRoutesStub } from 'react-router';
import { default as Route } from '../_layout.mail.inbox.$id';

describe('routes/_layout.mail.inbox.$id.tsx', () => {
  test('should render MessageDetail', () => {
    const RoutesStub = createRoutesStub([
      { Component: (props: any) => <Route {...props} />, path: '/' },
    ]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('MessageDetail')).toBeInTheDocument();
  });
});
