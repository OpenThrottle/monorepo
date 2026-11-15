import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { Command } from '../Command';
import { CommandInput } from '../CommandInput';

describe('CommandInput', () => {
  test('renders the search input with its placeholder', () => {
    const component = render(
      <Command>
        <CommandInput placeholder="Search commands" />
      </Command>,
    );
    expect(
      component.getByPlaceholderText('Search commands'),
    ).toBeInTheDocument();
  });
});
