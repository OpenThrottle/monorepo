import { render } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { CmsDevice } from '../../config/cms-device';
import { CMS_DEVICE } from '../../config/cms-device';
import { atomFragmentDraft } from '../../data/data.atom.fragment-draft';
import {
  atomSettings,
  atomSettingsDefault,
} from '../../data/data.atom.settings';
import { PREVIEW_COPY } from '../../data/data.copy';
import { CORE_COMPONENTS } from '../../data/data.registry';
import { MOCK_FRAGMENTS } from '../../data/mock.fragments';
import { CoreRendererDevelopment } from '../CoreRendererDevelopment';

const renderPreview = (device: CmsDevice, url: string) => {
  const store = createStore();
  store.set(atomSettings, { ...atomSettingsDefault, device });
  store.set(atomFragmentDraft, { copy: 'Edited live' });
  const Component = () => {
    return (
      <Provider store={store}>
        <CoreRendererDevelopment
          className={undefined}
          componentRegistry={CORE_COMPONENTS}
          fragments={MOCK_FRAGMENTS}
          getFragmentHref={(fragment) => `/edit/${fragment.uuid}`}
          renderUrl="https://cms.test/render/layout-1"
          selectedUuid="heading-1"
        />
      </Provider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub initialEntries={[url]} />);
};

describe('CoreRendererDevelopment', () => {
  describe('on desktop', () => {
    test('renders the page inline with the draft applied', () => {
      const component = renderPreview(CMS_DEVICE.DESKTOP, '/');

      expect(
        component.getByRole('heading', { name: 'Edited live' }),
      ).toBeInTheDocument();
      expect(component.queryAllByRole('link')).toHaveLength(0);
    });

    test('turns the editing layer on with ?debug=true', () => {
      const component = renderPreview(CMS_DEVICE.DESKTOP, '/?debug=true');

      expect(component.getAllByRole('link').length).toBeGreaterThan(0);
    });
  });

  describe('on mobile', () => {
    test('loads the render route in an iframe, passing the search params on', () => {
      const component = renderPreview(CMS_DEVICE.MOBILE, '/?debug=true');

      expect(component.getByTitle(PREVIEW_COPY.iframeTitle)).toHaveAttribute(
        'src',
        'https://cms.test/render/layout-1?debug=true',
      );
    });
  });
});
