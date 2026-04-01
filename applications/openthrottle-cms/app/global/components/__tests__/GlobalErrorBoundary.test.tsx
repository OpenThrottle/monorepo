import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { vi } from 'vitest';
import * as ReactRouter from 'react-router';
import type { ErrorResponse } from 'react-router';
import type { MockedFunction } from 'vitest';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import type { GlobalErrorBoundaryProps } from '../GlobalErrorBoundary';

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    isRouteErrorResponse: vi.fn(),
    useRouteError: vi.fn(),
  };
});

describe('GlobalErrorBoundary Component', () => {
  let component: RenderResult;
  let props: GlobalErrorBoundaryProps;
  let isRouteErrorResponseMock: MockedFunction<
    typeof ReactRouter.isRouteErrorResponse
  >;
  let useRouteErrorMock: MockedFunction<typeof ReactRouter.useRouteError>;

  beforeEach(() => {
    props = {};
    isRouteErrorResponseMock = vi.mocked(ReactRouter.isRouteErrorResponse);
    useRouteErrorMock = vi.mocked(ReactRouter.useRouteError);
    useRouteErrorMock.mockReset();
    isRouteErrorResponseMock.mockReset();
    vi.restoreAllMocks();
  });

  test('renders route error details and markdown content', () => {
    const routeError: ErrorResponse = {
      data: 'Not found content',
      // internal: false,
      status: 404,
      statusText: 'Not Found',
    };

    useRouteErrorMock.mockReturnValue(routeError);
    isRouteErrorResponseMock.mockReturnValue(true);
    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    expect(component.getByText('404 Not Found')).toBeInTheDocument();
    expect(component.getByText('Not found content')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /back to home/i }),
    ).toHaveAttribute('href', '/');
  });

  test('renders error message and stack trace when error is an Error', () => {
    const genericError = new Error('Something exploded');
    genericError.stack = 'Error stack trace';

    useRouteErrorMock.mockReturnValue(genericError);
    isRouteErrorResponseMock.mockReturnValue(false);
    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    expect(component.getByText('Error Message:')).toBeInTheDocument();
    expect(component.getByText('Something exploded')).toBeInTheDocument();
    expect(component.getByText('Stack trace:')).toBeInTheDocument();
    expect(component.getByText('Error stack trace')).toBeInTheDocument();
  });

  test('renders a clickable refresh button for retry', async () => {
    const genericError = new Error('Refresh me');
    useRouteErrorMock.mockReturnValue(genericError);
    isRouteErrorResponseMock.mockReturnValue(false);
    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    const user = userEvent.setup();
    const refreshButton = component.getByRole('button', { name: /refresh/i });

    expect(refreshButton).toBeInTheDocument();
    await user.click(refreshButton);

    expect(refreshButton).toBeEnabled();
  });

  test('renders unknown error fallback when route error is unknown', () => {
    useRouteErrorMock.mockReturnValue('unexpected');
    isRouteErrorResponseMock.mockReturnValue(false);
    const Component = () => <GlobalErrorBoundary {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);

    expect(component.getByText('Unknown Error')).toBeInTheDocument();
    expect(
      component.getByText(/sorry we've encountered an unknown error/i),
    ).toBeInTheDocument();
  });
});
