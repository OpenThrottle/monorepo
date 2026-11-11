import { render } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { CmsDevice } from '../../config/cms-device';
import { CMS_DEVICE } from '../../config/cms-device';
import {
  atomSettings,
  atomSettingsDefault,
} from '../../data/data.atom.settings';
import { CorePreviewFrame } from '../CorePreviewFrame';

const renderFrame = (device: CmsDevice) => {
  const store = createStore();
  store.set(atomSettings, { ...atomSettingsDefault, device });

  return render(
    <Provider store={store}>
      <CorePreviewFrame className={undefined}>
        <p>page</p>
      </CorePreviewFrame>
    </Provider>,
  );
};

describe('CorePreviewFrame', () => {
  test('renders the page inside it', () => {
    expect(
      renderFrame(CMS_DEVICE.DESKTOP).getByText('page'),
    ).toBeInTheDocument();
  });

  test.each([
    [CMS_DEVICE.DESKTOP, 'w-full'],
    [CMS_DEVICE.MOBILE, 'w-[390px]'],
    [CMS_DEVICE.TABLET, 'w-[820px]'],
  ])('sizes itself for %s', (device, width) => {
    const frame = renderFrame(device).getByTestId('CorePreviewFrame');

    expect(frame).toHaveAttribute('data-device', device);
    expect(frame).toHaveClass(width);
  });
});
