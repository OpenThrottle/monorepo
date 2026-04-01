import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import ContactWaitlistRoute from '../contact.waitlist';

describe('routes/contact.waitlist.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      {
        Component: (props: any) => <ContactWaitlistRoute {...props} />,
        path: '/',
      },
    ]);
    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('should render route heading', () => {
    expect(component.getByRole('heading', { level: 1 })).toHaveTextContent(
      'ContactWaitlist',
    );
  });

  test('renders ContactForm on the route', () => {
    expect(component.getByTestId('ContactForm')).toBeInTheDocument();
  });
});
