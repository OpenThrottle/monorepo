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
    const component = renderRoutesStub(<SettingsBuildTools />);

    expect(
      component.getByText('React Router / Vite devtools'),
    ).toBeInTheDocument();
    expect(component.getByText(/REACT_ROUTER_DEV_TOOLS/i)).toBeInTheDocument();

    expect(
      component.getByRole('link', { name: /quick reference/i }),
    ).toHaveAttribute('href', VITE_DEVTOOLS_DOC_QUICK_REF_HREF);
    expect(
      component.getByRole('link', {
        name: /openthrottle-developer-vite-devtools/i,
      }),
    ).toHaveAttribute('href', VITE_DEVTOOLS_DOC_HREF);
    expect(
      component.getByRole('link', { name: /vite cli build profiling/i }),
    ).toHaveAttribute('href', VITE_DEVTOOLS_DOC_PROFILING_HREF);
  });
});
