import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { SETTINGS_PREFERENCES_COPY } from '~/routing/settings/data/data.copy';

import type { SettingsPreferencesIntroProps } from '../SettingsPreferencesIntro';
import { SettingsPreferencesIntro } from '../SettingsPreferencesIntro';

describe('SettingsPreferencesIntro Component', () => {
  let component: RenderResult;
  let props: SettingsPreferencesIntroProps;

  beforeEach(() => {
    props = {};

    const Component = () => {
      return <SettingsPreferencesIntro {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the page heading', () => {
    expect(
      component.getByRole('heading', { name: SETTINGS_PREFERENCES_COPY.title }),
    ).toBeInTheDocument();
  });
});
