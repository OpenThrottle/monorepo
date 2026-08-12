import * as React from 'react';
import * as ReactRouter from 'react-router';
import { createRoutesStub } from 'react-router';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MailGlobalErrorBoundary } from '../MailGlobalErrorBoundary';
import type { MockedFunction } from 'vitest';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useRouteError: vi.fn(),
  };
});

describe('MailGlobalErrorBoundary Component', () => {
  let useRouteErrorMock: MockedFunction<typeof ReactRouter.useRouteError>;

  beforeEach(() => {
    useRouteErrorMock = vi.mocked(ReactRouter.useRouteError);
    useRouteErrorMock.mockReset();
  });

  test('renders route error details and links "Back to Home" to the mail inbox', () => {
    const genericError = new Error('Boom');
    useRouteErrorMock.mockReturnValue(genericError);

    const Component = () => <MailGlobalErrorBoundary />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByText('Boom')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /back to home/i }),
    ).toHaveAttribute('href', '/mail/');
  });
});
