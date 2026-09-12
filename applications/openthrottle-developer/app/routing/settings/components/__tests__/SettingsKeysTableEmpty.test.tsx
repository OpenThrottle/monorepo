import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import type { SettingsKeysTableEmptyProps } from '../SettingsKeysTableEmpty';
import { SettingsKeysTableEmpty } from '../SettingsKeysTableEmpty';

describe('SettingsKeysTableEmpty Component', () => {
  let component: RenderResult;
  let props: SettingsKeysTableEmptyProps;

  beforeEach(() => {
    props = {};
    component = render(<SettingsKeysTableEmpty {...props} />);
  });

  test('renders the empty-state testid', () => {
    expect(
      component.getByTestId('SettingsKeysTable-empty'),
    ).toBeInTheDocument();
  });

  test('renders the empty-state title and description', () => {
    expect(component.getByText('No credentials yet')).toBeInTheDocument();
    expect(
      component.getByText(
        /Create a credential to get a one-time bearer token/i,
      ),
    ).toBeInTheDocument();
  });
});
