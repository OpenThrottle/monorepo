import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '../Tabs';
import { TabsContent } from '../TabsContent';
import { TabsList } from '../TabsList';
import { TabsTrigger } from '../TabsTrigger';

describe('Tabs', () => {
  it('should render root', () => {
    const component = render(<Tabs />);
    const root = component.container.firstElementChild;
    expect(root).toBeInTheDocument();
  });

  it('should render TabsList with role tablist and list styling', () => {
    const component = render(
      <Tabs defaultValue="a">
        <TabsList>List</TabsList>
        <TabsContent value="a">Hidden</TabsContent>
      </Tabs>,
    );
    const list = component.container.querySelector('[role="tablist"]');
    expect(list).toBeInTheDocument();
    expect(list).toHaveTextContent('List');
    expect(list).toHaveClass('inline-flex', 'bg-muted');
    expect(list).toHaveClass('group-data-[orientation=horizontal]/tabs:h-9');
  });

  it('should render TabsTrigger as button with role tab', () => {
    const component = render(
      <Tabs defaultValue="t1">
        <TabsList>
          <TabsTrigger value="t1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="t1">C</TabsContent>
      </Tabs>,
    );
    const trigger = component.container.querySelector('button[role="tab"]');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Tab 1');
  });

  it('should render TabsContent with role tabpanel and panel text when selected', () => {
    const component = render(
      <Tabs defaultValue="p1">
        <TabsList>
          <TabsTrigger value="p1">T</TabsTrigger>
        </TabsList>
        <TabsContent value="p1">Panel</TabsContent>
      </Tabs>,
    );
    const content = component.container.querySelector('[role="tabpanel"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Panel');
  });

  it('marks the selected tab with aria-selected true', () => {
    const component = render(
      <Tabs defaultValue="b">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A</TabsContent>
        <TabsContent value="b">B</TabsContent>
      </Tabs>,
    );
    expect(component.getByRole('tab', { name: 'A' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(component.getByRole('tab', { name: 'B' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('associates tablist with tabs via aria-controls on triggers', () => {
    const component = render(
      <Tabs defaultValue="x">
        <TabsList>
          <TabsTrigger value="x">X</TabsTrigger>
        </TabsList>
        <TabsContent value="x">Panel</TabsContent>
      </Tabs>,
    );
    const tab = component.getByRole('tab', { name: 'X' });
    const panel = component.getByRole('tabpanel');
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
  });
});

describe('Tabs keyboard navigation', () => {
  it('moves selection with ArrowRight and ArrowLeft', async () => {
    const user = userEvent.setup();
    const component = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );

    await user.click(component.getByRole('tab', { name: 'A' }));
    await user.keyboard('{ArrowRight}');
    expect(component.getByRole('tab', { name: 'B' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(component.getByText('Panel B')).toBeVisible();

    await user.keyboard('{ArrowLeft}');
    expect(component.getByRole('tab', { name: 'A' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(component.getByText('Panel A')).toBeVisible();
  });

  it('moves focus to first and last tab with Home and End', async () => {
    const user = userEvent.setup();
    const component = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A</TabsContent>
        <TabsContent value="b">B</TabsContent>
        <TabsContent value="c">C</TabsContent>
      </Tabs>,
    );

    await user.click(component.getByRole('tab', { name: 'A' }));
    await user.keyboard('{End}');
    expect(component.getByRole('tab', { name: 'C' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Home}');
    expect(component.getByRole('tab', { name: 'A' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

describe('Tabs controlled and uncontrolled value', () => {
  it('updates the active panel when using defaultValue (uncontrolled)', async () => {
    const user = userEvent.setup();
    const component = render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First</TabsContent>
        <TabsContent value="two">Second</TabsContent>
      </Tabs>,
    );

    await user.click(component.getByRole('tab', { name: 'Two' }));
    expect(component.getByText('Second')).toBeVisible();
    expect(component.queryByText('First')).not.toBeInTheDocument();
  });

  it('calls onValueChange and updates when value is controlled', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    const Controlled = (): React.ReactElement => {
      const [value, setValue] = React.useState('x');

      return (
        <Tabs
          onValueChange={(next) => {
            onValueChange(next);
            setValue(next);
          }}
          value={value}
        >
          <TabsList>
            <TabsTrigger value="x">X</TabsTrigger>
            <TabsTrigger value="y">Y</TabsTrigger>
          </TabsList>
          <TabsContent value="x">CX</TabsContent>
          <TabsContent value="y">CY</TabsContent>
        </Tabs>
      );
    };

    const component = render(<Controlled />);
    await user.click(component.getByRole('tab', { name: 'Y' }));

    expect(onValueChange).toHaveBeenCalledWith('y');
    expect(component.getByText('CY')).toBeVisible();
  });

  it('does not change the active panel when value is fixed and only onValueChange fires', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    const component = render(
      <Tabs onValueChange={onValueChange} value="only">
        <TabsList>
          <TabsTrigger value="only">Only</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>
        <TabsContent value="only">Stay</TabsContent>
        <TabsContent value="other">Go</TabsContent>
      </Tabs>,
    );

    await user.click(component.getByRole('tab', { name: 'Other' }));
    expect(onValueChange).toHaveBeenCalledWith('other');
    expect(component.getByRole('tab', { name: 'Only' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(component.getByText('Stay')).toBeVisible();
    expect(component.queryByText('Go')).not.toBeInTheDocument();
  });
});

describe('Tabs disabled state', () => {
  it('skips disabled triggers when navigating with ArrowRight', async () => {
    const user = userEvent.setup();
    const component = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger disabled={true} value="b">
            B
          </TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </Tabs>,
    );

    await user.click(component.getByRole('tab', { name: 'A' }));
    await user.keyboard('{ArrowRight}');

    expect(component.getByRole('tab', { name: 'B' })).toBeDisabled();
    expect(component.getByRole('tab', { name: 'C' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(component.getByRole('tabpanel')).toHaveTextContent('Panel C');
  });

  it('does not activate a disabled tab on click', async () => {
    const user = userEvent.setup();
    const component = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger disabled={true} value="b">
            B
          </TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );

    await user.click(component.getByRole('tab', { name: 'B' }));
    expect(component.getByRole('tab', { name: 'A' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(component.getByText('Panel A')).toBeVisible();
  });
});
