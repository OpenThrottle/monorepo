import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AccordionItem } from '../AccordionItem';
import type { AccordionItemProps } from '../AccordionItem';

describe('AccordionItem Component', () => {
  let component: RenderResult;
  let props: AccordionItemProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AccordionItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
