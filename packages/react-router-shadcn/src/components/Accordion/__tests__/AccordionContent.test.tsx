import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AccordionContent } from '../AccordionContent';
import type { AccordionContentProps } from '../AccordionContent';

describe('AccordionContent Component', () => {
  let component: RenderResult;
  let props: AccordionContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AccordionContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
