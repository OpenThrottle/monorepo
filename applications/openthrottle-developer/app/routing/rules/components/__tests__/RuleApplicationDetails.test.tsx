import { cleanup, render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import { RULE_DETAIL_COPY } from '~/routing/rules/data/data.copy';

import { RuleApplicationDetails } from '../RuleApplicationDetails';

const renderDetails = (
  detailsJson: string | null,
): ReturnType<typeof render> => {
  const Component = (): React.ReactElement => {
    return <RuleApplicationDetails detailsJson={detailsJson} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('RuleApplicationDetails', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders nothing for empty details', () => {
    const component = renderDetails(null);

    expect(
      component.queryByTestId('RuleApplicationDetails'),
    ).not.toBeInTheDocument();
  });

  test('labels a known reason', () => {
    const component = renderDetails('{"reason":"skill-unavailable"}');

    expect(
      component.getByText(
        RULE_DETAIL_COPY.detailsReasonLabels['skill-unavailable'],
      ),
    ).toBeInTheDocument();
  });

  test('falls back to the raw reason when it has no label', () => {
    const component = renderDetails('{"reason":"something-new"}');

    expect(component.getByText('something-new')).toBeInTheDocument();
  });

  test('links the superseding rule to its detail page', () => {
    const component = renderDetails(
      '{"reason":"superseded-by","ruleId":"12345678-aaaa-bbbb-cccc-000000000000"}',
    );

    expect(component.getByRole('link')).toHaveAttribute(
      'href',
      '/rules/12345678-aaaa-bbbb-cccc-000000000000',
    );
    expect(component.getByRole('link')).toHaveTextContent('12345678');
  });

  test('shows a short prompt id and leftover keys', () => {
    const component = renderDetails(
      '{"promptId":"abcdef12-0000-0000-0000-000000000000","note":"x"}',
    );

    expect(component.getByText('abcdef12')).toBeInTheDocument();
    expect(
      component
        .getByTestId('RuleApplicationDetails')
        .querySelector('[data-detail="extra"]'),
    ).toHaveTextContent('note: x');
  });
});
