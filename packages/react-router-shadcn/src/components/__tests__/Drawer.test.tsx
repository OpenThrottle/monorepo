import * as React from 'react';
import { render, screen } from '@testing-library/react';
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
  it('should render Drawer root with children', () => {
    const { container } = render(
      <Drawer>
        <span>child</span>
      </Drawer>,
    );
    expect(container.textContent).toContain('child');
  });

  it('should render DrawerContent with expected content', () => {
    render(
      <Drawer open={true}>
        <DrawerContent>Content</DrawerContent>
      </Drawer>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
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
