import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../Tabs';

describe('Tabs', () => {
  it('should render root', () => {
    const { container } = render(<Tabs />);
    const root = container.firstElementChild;
    expect(root).toBeInTheDocument();
  });

  it('should render TabsList with role tablist', () => {
    const { container } = render(
      <Tabs>
        <TabsList>List</TabsList>
      </Tabs>,
    );
    const list = container.querySelector('[role="tablist"]');
    expect(list).toBeInTheDocument();
    expect(list).toHaveTextContent('List');
    expect(list).toHaveClass('inline-flex', 'h-10', 'bg-muted');
  });

  it('should render TabsTrigger as button with role tab', () => {
    const { container } = render(
      <Tabs>
        <TabsList>
          <TabsTrigger>Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const trigger = container.querySelector('button[role="tab"]');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Tab 1');
  });

  it('should render TabsContent with role tabpanel', () => {
    const { container } = render(
      <Tabs>
        <TabsContent>Panel</TabsContent>
      </Tabs>,
    );
    const content = container.querySelector('[role="tabpanel"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Panel');
  });
});
