import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { MessageDetailSkeleton } from '../MessageDetailSkeleton';

describe('MessageDetailSkeleton Component', () => {
  test('renders header and body skeleton placeholders', () => {
    const Component = () => <MessageDetailSkeleton />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('MessageDetailSkeleton')).toBeInTheDocument();
    expect(
      component.getByTestId('MessageDetail-skeleton-title'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('MessageDetail-skeleton-description'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('MessageDetail-skeleton-line1'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('MessageDetail-skeleton-line2'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('MessageDetail-skeleton-line3'),
    ).toBeInTheDocument();
  });
});
