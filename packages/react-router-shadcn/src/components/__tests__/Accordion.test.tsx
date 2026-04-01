import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../Accordion';

describe('Accordion Component', () => {
  let component: RenderResult;
  let props: React.ComponentPropsWithoutRef<typeof Accordion>;

  beforeEach(() => {
    props = {
      collapsible: true,
      type: 'single',
    };

    const Component = () => (
      <Accordion {...props}>
        <AccordionItem value="one">
          <AccordionTrigger>Section one</AccordionTrigger>
          <AccordionContent>Content one</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render accordion section trigger', () => {
    expect(
      component.getByRole('button', { name: 'Section one' }),
    ).toBeInTheDocument();
  });
});
