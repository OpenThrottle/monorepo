import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Command } from '../Command';
import { CommandInput } from '../CommandInput';

describe('CommandInput', () => {
  test('renders the search input with its placeholder', () => {
    render(
      <Command>
        <CommandInput placeholder="Search commands" />
      </Command>,
    );
    expect(screen.getByPlaceholderText('Search commands')).toBeInTheDocument();
  });
});
