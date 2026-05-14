import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CommandShortcut } from '../CommandShortcut';
import type { CommandShortcutProps } from '../CommandShortcut';

describe('CommandShortcut Component', () => {
  let component: RenderResult;
  let props: CommandShortcutProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CommandShortcut {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
