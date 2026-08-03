import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RolloutFlagKind } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagVariationValueField } from '../RolloutFlagVariationValueField';
import type { RolloutFlagVariationValueFieldProps } from '../RolloutFlagVariationValueField';

describe('RolloutFlagVariationValueField Component', () => {
  let component: RenderResult;
  let props: RolloutFlagVariationValueFieldProps;

  const setup = (): void => {
    const Component = () => <RolloutFlagVariationValueField {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      editValue: '{"a":1}',
      id: 'value-0',
      index: 0,
      kind: RolloutFlagKind.Json,
      onValueChange: () => undefined,
    };
    setup();
  });

  test('renders a json textarea without parse error for valid JSON', () => {
    expect(
      component.getByPlaceholderText(ROLLOUT_COPY.variationJsonPlaceholder),
    ).toHaveValue('{"a":1}');
    expect(component.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('surfaces invalid JSON via copy constant', () => {
    component.unmount();
    props = { ...props, editValue: '{bad' };
    setup();
    expect(component.getByRole('alert')).toHaveTextContent(
      ROLLOUT_COPY.variationJsonInvalid,
    );
  });
});
