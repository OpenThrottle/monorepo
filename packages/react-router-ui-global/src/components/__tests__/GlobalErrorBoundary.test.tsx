import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as ReactRouter from 'react-router';
import type { ErrorResponse } from 'react-router';
import type { MockedFunction } from 'vitest';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import type { GlobalErrorBoundaryProps } from '../GlobalErrorBoundary';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useRouteError: vi.fn(),
  };
});

describe('GlobalErrorBoundary Component', () => {
  let component: RenderResult;
  let props: GlobalErrorBoundaryProps;
  let useRouteErrorMock: MockedFunction<typeof ReactRouter.useRouteError>;

  beforeEach(() => {
    props = {};
    useRouteErrorMock = vi.mocked(ReactRouter.useRouteError);
    useRouteErrorMock.mockReset();
  });

  test('renders route error details, support reference, and markdown content', () => {
    const routeError: ErrorResponse = {
      data: 'Not found content',
      status: 404,
      statusText: 'Not Found',
    };

    useRouteErrorMock.mockReturnValue(routeError);
    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    expect(component.getByText('404 Not Found')).toBeInTheDocument();
    expect(component.getByText('Not found content')).toBeInTheDocument();
    expect(component.getByText('Support reference')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /back to home/i }),
    ).toHaveAttribute('href', '/');
  });

  test('uses homePath for back link', () => {
    const routeError: ErrorResponse = {
      data: 'x',
      status: 500,
      statusText: 'Error',
    };
    useRouteErrorMock.mockReturnValue(routeError);
    const Component = () => (
      <GlobalErrorBoundary {...props} homePath="/mail/" />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
    expect(
      component.getByRole('link', { name: /back to home/i }),
    ).toHaveAttribute('href', '/mail/');
  });

  test('renders JavaScript error with subtype title and support reference', () => {
    const genericError = new Error('Something exploded');
    genericError.stack = 'Error stack trace';

    useRouteErrorMock.mockReturnValue(genericError);
    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    expect(
      component.getByRole('heading', { name: 'Application error' }),
    ).toBeInTheDocument();
    expect(component.getByText('Something exploded')).toBeInTheDocument();
    expect(component.getByText('Support reference')).toBeInTheDocument();
  });

  test('renders refresh control for Error branch', async () => {
    const genericError = new Error('Refresh me');
    useRouteErrorMock.mockReturnValue(genericError);
    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    const user = userEvent.setup();
    const refreshButton = component.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
    await user.click(refreshButton);
    expect(refreshButton).toBeEnabled();
  });

  test('renders unknown error fallback when route error is not Error or route response', () => {
    useRouteErrorMock.mockReturnValue('unexpected');
    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    expect(
      component.getByRole('heading', { name: 'Unexpected error' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(/sorry we've encountered an unexpected problem/i),
    ).toBeInTheDocument();
  });
});
