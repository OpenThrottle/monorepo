import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../Drawer';

describe('Drawer', () => {
  it('should render Drawer root', () => {
    const { container } = render(<Drawer />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render DrawerContent with expected content', () => {
    const { container } = render(
      <Drawer>
        <DrawerContent>Content</DrawerContent>
      </Drawer>,
    );
    expect(container.textContent).toContain('Content');
  });

  it('should render DrawerHeader, DrawerTitle, DrawerDescription', () => {
    const { container } = render(
      <Drawer>
        <DrawerHeader>
          <DrawerTitle>Title</DrawerTitle>
          <DrawerDescription>Description</DrawerDescription>
        </DrawerHeader>
      </Drawer>,
    );
    expect(container.querySelector('h2')).toHaveTextContent('Title');
    expect(container.querySelector('p')).toHaveTextContent('Description');
  });

  it('should render DrawerFooter', () => {
    const { container } = render(
      <Drawer>
        <DrawerFooter>Footer</DrawerFooter>
      </Drawer>,
    );
    expect(container.textContent).toContain('Footer');
  });

  it('should render DrawerTrigger as button', () => {
    const { container } = render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
      </Drawer>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Open');
  });
});
