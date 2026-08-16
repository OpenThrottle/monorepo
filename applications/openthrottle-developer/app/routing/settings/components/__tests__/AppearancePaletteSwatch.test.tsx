import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OPENTHROTTLE_THEME } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppearancePaletteSwatch } from '../AppearancePaletteSwatch';
import type { AppearancePaletteSwatchProps } from '../AppearancePaletteSwatch';
import { APPEARANCE_SWATCH_TOKEN_NAMES } from '~/routing/settings/data/data.appearance';

describe('AppearancePaletteSwatch Component', () => {
  let component: RenderResult;
  let props: AppearancePaletteSwatchProps;

  beforeEach(() => {
    props = {
      isSelected: false,
      mode: 'light',
      onSelect: vi.fn(),
      theme: OPENTHROTTLE_THEME,
    };

    component = render(<AppearancePaletteSwatch {...props} />);
  });

  test('renders the theme label and one chip per swatch token', () => {
    const tile = component.getByTestId('AppearancePaletteSwatch');

    expect(tile).toHaveTextContent(OPENTHROTTLE_THEME.label);
    expect(tile.querySelectorAll('span[style]')).toHaveLength(
      APPEARANCE_SWATCH_TOKEN_NAMES.length,
    );
  });

  test('announces selection state via aria-pressed', () => {
    expect(component.getByRole('button')).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    component.unmount();
    const selected = render(
      <AppearancePaletteSwatch {...props} isSelected={true} />,
    );

    expect(selected.getByRole('button')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('selects by theme id, or by the explicit value when given', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button'));
    expect(props.onSelect).toHaveBeenCalledWith(OPENTHROTTLE_THEME.id);

    component.unmount();
    const onSelect = vi.fn();
    const sentinel = render(
      <AppearancePaletteSwatch
        {...props}
        onSelect={onSelect}
        value="default"
      />,
    );

    await user.click(sentinel.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('default');
  });

  test('draws chips from the record matching the resolved mode', () => {
    // jsdom rewrites `hsl(...)` to `rgb(...)`, so compare the two modes against
    // each other rather than against the raw token strings.
    const lightChip = component
      .getByTestId('AppearancePaletteSwatch')
      .querySelector('span[style]');
    const lightBackground = lightChip?.getAttribute('style');

    component.unmount();
    const dark = render(<AppearancePaletteSwatch {...props} mode="dark" />);
    const darkBackground = dark
      .getByTestId('AppearancePaletteSwatch')
      .querySelector('span[style]')
      ?.getAttribute('style');

    expect(lightBackground).toBeTruthy();
    expect(darkBackground).toBeTruthy();
    expect(darkBackground).not.toBe(lightBackground);
  });
});
