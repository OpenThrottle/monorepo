import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { <%= name %> } from '../<%= name %>';
import type { <%= name %>Props } from '../<%= name %>';

describe('<%= name %> Component', () => {
  describe('modal is open', () => {
    let component: RenderResult;
    let props: <%= name %>Props;

    beforeEach(() => {
      props = {};

      const Component = () => <<%= name %> {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(
        <RoutesStub initialEntries={['/?modal=<%= nameKebab %>']} />,
      );
    });

    test('should render', () => {
      expect(component.getByText('<%= name %>')).toBeInTheDocument();
    });
  });

  describe('modal is closed', () => {
    let component: RenderResult;
    let props: <%= name %>Props;

    beforeEach(() => {
      props = {};

      const Component = () => <<%= name %> {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should not render', () => {
      expect(component.container).toContainHTML('<div />');
    });
  });
});
