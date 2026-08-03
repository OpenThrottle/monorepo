import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RolloutFlagKind } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagVariationsEditor } from '../RolloutFlagVariationsEditor';
import type { RolloutFlagVariationsEditorProps } from '../RolloutFlagVariationsEditor';

describe('RolloutFlagVariationsEditor Component', () => {
  let component: RenderResult;
  let props: RolloutFlagVariationsEditorProps;
  let latest: RolloutFlagVariationsEditorProps['variations'];

  beforeEach(() => {
    latest = [
      { description: '', name: 'control', valueJson: 'false' },
      { description: '', name: 'treatment', valueJson: 'true' },
    ];
    props = {
      idPrefix: 'edit',
      kind: RolloutFlagKind.Boolean,
      onChange: (variations) => {
        latest = variations;
      },
      variations: latest,
    };

    const Component = () => <RolloutFlagVariationsEditor {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders variation labels from copy and can add a row', async () => {
    const user = userEvent.setup();
    expect(
      component.getByText(ROLLOUT_COPY.variationsLabel),
    ).toBeInTheDocument();

    await user.click(
      component.getByRole('button', { name: ROLLOUT_COPY.addVariationButton }),
    );
    expect(latest).toHaveLength(3);
  });
});
