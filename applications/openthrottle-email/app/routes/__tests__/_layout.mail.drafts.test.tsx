import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { default as Route } from '../_layout.mail.drafts';

describe('routes/_layout.mail.drafts.tsx', () => {
  test('should render', () => {
    const RoutesStub = createRoutesStub([{ Component: Route, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('MessageList')).toBeInTheDocument();
  });
});
