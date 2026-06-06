import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsStoreProvider } from '../NotificationsStoreProvider';
import type { NotificationsStoreProviderProps } from '../NotificationsStoreProvider';

describe('NotificationsStoreProvider Component', () => {
  let props: NotificationsStoreProviderProps;

  beforeEach(() => {
    props = { children: null };
  });

  test('renders without visible UI when children is null', () => {
    const Component = () => <NotificationsStoreProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container } = render(<RoutesStub />);

    expect(container).toBeEmptyDOMElement();
  });
});
