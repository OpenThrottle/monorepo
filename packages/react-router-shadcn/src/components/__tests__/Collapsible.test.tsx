import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../Collapsible';

describe('Collapsible', () => {
  it('should render trigger as button', () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Open</CollapsibleTrigger>
      </Collapsible>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Open');
  });

  it('should render CollapsibleContent when open', () => {
    render(
      <Collapsible defaultOpen={true}>
        <CollapsibleTrigger>Open</CollapsibleTrigger>
        <CollapsibleContent>Panel</CollapsibleContent>
      </Collapsible>,
    );
    const region = document.body.querySelector('[data-state="open"]');
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent('Panel');
  });
});
