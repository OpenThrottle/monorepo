import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLocation } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import { RULE_PREVIEW_ENVIRONMENT_PARAM } from '~/routing/rules/config/rule-preview';
import { RULE_PREVIEW_COPY } from '~/routing/rules/data/data.copy';

import { RulePreviewEnvironmentSelect } from '../RulePreviewEnvironmentSelect';

const renderSelect = (entry: string): ReturnType<typeof render> => {
  const Component = (): React.ReactElement => {
    const location = useLocation();

    return (
      <>
        <RulePreviewEnvironmentSelect />
        <output data-testid="Search">{location.search}</output>
      </>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/rules/:ruleId' }]);

  return render(<RoutesStub initialEntries={[entry]} />);
};

describe('RulePreviewEnvironmentSelect', () => {
  afterEach(() => {
    cleanup();
  });

  test('reflects the environment in the URL', async () => {
    const component = renderSelect(
      `/rules/r1?${RULE_PREVIEW_ENVIRONMENT_PARAM}=ci`,
    );

    expect(
      await component.findByRole('combobox', {
        name: RULE_PREVIEW_COPY.environmentLabel,
      }),
    ).toHaveTextContent('ci');
  });

  test('defaults to None when the URL has no environment', async () => {
    const component = renderSelect('/rules/r1');

    expect(
      await component.findByRole('combobox', {
        name: RULE_PREVIEW_COPY.environmentLabel,
      }),
    ).toHaveTextContent(RULE_PREVIEW_COPY.environmentNone);
  });

  test('writes the picked environment to the URL and clears it on None', async () => {
    const user = userEvent.setup();
    const component = renderSelect('/rules/r1');

    await user.click(
      await component.findByRole('combobox', {
        name: RULE_PREVIEW_COPY.environmentLabel,
      }),
    );
    await user.click(component.getByRole('option', { name: 'ralph' }));

    expect(component.getByTestId('Search')).toHaveTextContent(
      `${RULE_PREVIEW_ENVIRONMENT_PARAM}=ralph`,
    );

    await user.click(
      component.getByRole('combobox', {
        name: RULE_PREVIEW_COPY.environmentLabel,
      }),
    );
    await user.click(
      component.getByRole('option', {
        name: RULE_PREVIEW_COPY.environmentNone,
      }),
    );

    expect(component.getByTestId('Search')).toBeEmptyDOMElement();
  });
});
