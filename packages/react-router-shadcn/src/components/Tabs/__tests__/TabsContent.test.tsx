import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TabsContent } from '../TabsContent';
import type { TabsContentProps } from '../TabsContent';

describe('TabsContent Component', () => {
  let component: RenderResult;
  let props: TabsContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TabsContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
