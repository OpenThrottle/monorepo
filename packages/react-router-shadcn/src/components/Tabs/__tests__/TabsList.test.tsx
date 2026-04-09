import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TabsList } from '../TabsList';
import type { TabsListProps } from '../TabsList';

describe('TabsList Component', () => {
  let component: RenderResult;
  let props: TabsListProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TabsList {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
