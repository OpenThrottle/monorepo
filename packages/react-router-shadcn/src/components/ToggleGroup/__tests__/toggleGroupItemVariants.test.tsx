import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { toggleGroupItemVariants } from '../toggleGroupItemVariants';
import type { toggleGroupItemVariantsProps } from '../toggleGroupItemVariants';

describe('toggleGroupItemVariants Component', () => {
  let component: RenderResult;
  let props: toggleGroupItemVariantsProps;

  beforeEach(() => {
    props = {};

    const ToggleGroupItemVariantsScaffold = toggleGroupItemVariants;
    const Component = () => <ToggleGroupItemVariantsScaffold {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
