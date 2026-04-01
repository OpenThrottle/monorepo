import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsStoreProvider } from '../NotificationsStoreProvider';
import type { NotificationsStoreProviderProps } from '../NotificationsStoreProvider';

describe('NotificationsStoreProvider Component', () => {
  let component: RenderResult;
  let props: NotificationsStoreProviderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotificationsStoreProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
