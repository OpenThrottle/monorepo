import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanRuleApplications } from '../PlanRuleApplications';
import type { PlanRuleApplicationsProps } from '../PlanRuleApplications';

describe('PlanRuleApplications Component', () => {
  let component: RenderResult;
  let props: PlanRuleApplicationsProps;

  beforeEach(() => {
    props = {
      applications: [
        {
          createdAt: '2026-07-13T00:00:00.000Z',
          detailsJson: null,
          id: 'app-1',
          ruleId: '11111111-aaaa-4aaa-8aaa-111111111111',
          state: 'applied',
          taskId: '22222222-bbbb-4bbb-8bbb-222222222222',
        },
        {
          createdAt: '2026-07-13T00:00:00.000Z',
          detailsJson: '{"reason":"skill-unavailable"}',
          id: 'app-2',
          ruleId: '33333333-cccc-4ccc-8ccc-333333333333',
          state: 'flagged',
          taskId: null,
        },
      ],
    };

    component = render(<PlanRuleApplications {...props} />);
  });

  test('renders the flagged row first with its details payload', () => {
    const items = component.getAllByRole('listitem');

    expect(items[0]).toHaveTextContent('flagged');
    expect(items[0]).toHaveTextContent('reason: "skill-unavailable"');
    expect(items[1]).toHaveTextContent('applied');
  });

  test('renders nothing when there are no applications', () => {
    component.unmount();
    const empty = render(<PlanRuleApplications applications={[]} />);

    expect(empty.container.firstChild).toBeNull();
  });
});
