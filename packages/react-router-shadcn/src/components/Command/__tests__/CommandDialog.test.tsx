import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CommandDialog } from '../CommandDialog';
import type { CommandDialogProps } from '../CommandDialog';

describe('CommandDialog Component', () => {
  let component: RenderResult;
  let props: CommandDialogProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CommandDialog {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
