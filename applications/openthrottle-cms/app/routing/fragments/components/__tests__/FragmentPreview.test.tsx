import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { FRAGMENT_PREVIEW_COPY } from '~/routing/fragments/data/data.copy';
import {
  MOCK_FRAGMENT_CHILD_PICKER,
  MOCK_FRAGMENT_EDITOR_RECORDS,
} from '~/routing/fragments/data/mock.fragment-editor';

import { FragmentEditor } from '../FragmentEditor';
import { FragmentPreview } from '../FragmentPreview';

const renderPair = () => {
  const records = MOCK_FRAGMENT_EDITOR_RECORDS;
  const Component = () => {
    return (
      <Provider>
        <FragmentEditor
          childPicker={MOCK_FRAGMENT_CHILD_PICKER}
          className={undefined}
          records={records}
          result={undefined}
        />
        <FragmentPreview className={undefined} records={records} />
      </Provider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('FragmentPreview', () => {
  test('renders the stored fragment through the component registry', () => {
    const component = renderPair();
    const preview = component.getByRole('region', {
      name: FRAGMENT_PREVIEW_COPY.heading,
    });

    expect(
      within(preview).getByRole('heading', { level: 2, name: 'Hello' }),
    ).toBeInTheDocument();
  });

  test('shows a typed edit before it is saved', async () => {
    const component = renderPair();
    const preview = component.getByRole('region', {
      name: FRAGMENT_PREVIEW_COPY.heading,
    });

    await userEvent.type(
      component.getByRole('textbox', { name: 'copy' }),
      ' world',
    );

    expect(
      within(preview).getByRole('heading', { level: 2, name: 'Hello world' }),
    ).toBeInTheDocument();
  });

  test('resizes the frame from the device toggle', async () => {
    const component = renderPair();

    expect(component.getByTestId('CorePreviewFrame')).toHaveAttribute(
      'data-device',
      'desktop',
    );

    await userEvent.click(
      component.getByRole('radio', { name: FRAGMENT_PREVIEW_COPY.mobile }),
    );

    expect(component.getByTestId('CorePreviewFrame')).toHaveAttribute(
      'data-device',
      'mobile',
    );
  });
});
