import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Drawer } from '../Drawer';

describe('Drawer', () => {
  test('renders its children through the root', () => {
    const { container } = render(
      <Drawer>
        <span>Root child</span>
      </Drawer>,
    );
    expect(container.textContent).toContain('Root child');
  });
});
