import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import type { SettingsLogsIntroProps } from '../SettingsLogsIntro';
import { SettingsLogsIntro } from '../SettingsLogsIntro';

describe('SettingsLogsIntro Component', () => {
  let component: RenderResult;
  let props: SettingsLogsIntroProps;

  beforeEach(() => {
    props = {};
    component = render(<SettingsLogsIntro {...props} />);
  });

  test('renders the Logs heading', () => {
    expect(
      component.getByRole('heading', { name: 'Logs' }),
    ).toBeInTheDocument();
  });

  test('renders the purpose blurb and privacy caution', () => {
    expect(
      component.getByText(/capture browser console output/i),
    ).toBeInTheDocument();
    expect(
      component.getByText(/logs may include urls or user-visible strings/i),
    ).toBeInTheDocument();
  });
});
