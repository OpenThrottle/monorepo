import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { MessageListSkeleton } from '../MessageListSkeleton';
import type { MessageListSkeletonProps } from '../MessageListSkeleton';

describe('MessageListSkeleton Component', () => {
  const renderComponent = (props: MessageListSkeletonProps) => {
    const Component = () => <MessageListSkeleton {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('renders 5 skeleton rows and the header columns', () => {
    const component = renderComponent({ selectionEnabled: false });

    expect(component.getByTestId('MessageListSkeleton')).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Subject' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'From' }),
    ).toBeInTheDocument();
    expect(component.getAllByRole('row')).toHaveLength(6); // header + 5 body rows
  });

  test('omits the selection column when selectionEnabled is false', () => {
    const component = renderComponent({ selectionEnabled: false });
    const headerRow = component.getAllByRole('row')[0];
    expect(headerRow.children).toHaveLength(4);
  });

  test('adds a leading checkbox column when selectionEnabled is true', () => {
    const component = renderComponent({ selectionEnabled: true });
    const headerRow = component.getAllByRole('row')[0];
    expect(headerRow.children).toHaveLength(5);
  });
});
