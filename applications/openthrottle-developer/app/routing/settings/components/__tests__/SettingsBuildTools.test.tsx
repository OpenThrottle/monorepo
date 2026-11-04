import { screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  VITE_DEVTOOLS_DOC_HREF,
  VITE_DEVTOOLS_DOC_PROFILING_HREF,
  VITE_DEVTOOLS_DOC_QUICK_REF_HREF,
} from '~/routing/settings/utils/settings-docs-links';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsBuildTools } from '../SettingsBuildTools';

describe('SettingsBuildTools Component', () => {
  test('renders devtools guidance and documentation links', () => {
    renderRoutesStub(<SettingsBuildTools />);

    expect(
      screen.getByText('React Router / Vite devtools'),
    ).toBeInTheDocument();
    expect(screen.getByText(/REACT_ROUTER_DEV_TOOLS/i)).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /quick reference/i }),
    ).toHaveAttribute('href', VITE_DEVTOOLS_DOC_QUICK_REF_HREF);
    expect(
      screen.getByRole('link', {
        name: /openthrottle-developer-vite-devtools/i,
      }),
    ).toHaveAttribute('href', VITE_DEVTOOLS_DOC_HREF);
    expect(
      screen.getByRole('link', { name: /vite cli build profiling/i }),
    ).toHaveAttribute('href', VITE_DEVTOOLS_DOC_PROFILING_HREF);
  });
});
