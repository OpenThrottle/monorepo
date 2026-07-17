import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RulesTable } from '../RulesTable';
import type { RulesTableProps } from '../RulesTable';

describe('RulesTable Component', () => {
  let component: RenderResult;
  let props: RulesTableProps;

  beforeEach(() => {
    props = {
      onDelete: vi.fn(),
      onEdit: vi.fn(),
      onToggleEnabled: vi.fn(),
      rules: [
        {
          actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
          actionType: 'inject-task',
          enabled: true,
          environment: null,
          id: 'rule-1',
          status: 'PENDING',
          tagAll: ['breakdown'],
          title: 'Grill breakdowns',
        },
      ],
    };

    component = render(<RulesTable {...props} />);
  });

  test('renders the rule match and action summary', () => {
    expect(component.getByText('inject-task')).toBeInTheDocument();
    expect(component.getByText('breakdown')).toBeInTheDocument();
    expect(component.getByText('status=PENDING')).toBeInTheDocument();
  });

  test('delegates edit/delete/toggle to the callbacks', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: RULES_COPY.editAction }),
    );
    await user.click(
      component.getByRole('button', { name: RULES_COPY.deleteAction }),
    );
    await user.click(
      component.getByRole('button', { name: RULES_COPY.disableAction }),
    );

    expect(props.onEdit).toHaveBeenCalledWith(props.rules[0]);
    expect(props.onDelete).toHaveBeenCalledWith('rule-1');
    expect(props.onToggleEnabled).toHaveBeenCalledWith(props.rules[0]);
  });

  test('shows the designed empty state when there are no rules', () => {
    component.unmount();
    const empty = render(<RulesTable {...props} rules={[]} />);

    expect(empty.getByText(RULES_COPY.emptyTitle)).toBeInTheDocument();
    expect(empty.getByText(RULES_COPY.emptyBody)).toBeInTheDocument();
  });
});
