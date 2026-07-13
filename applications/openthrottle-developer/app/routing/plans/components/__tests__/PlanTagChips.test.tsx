import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanTagChips } from '../PlanTagChips';
import type { PlanTagChipsProps } from '../PlanTagChips';

describe('PlanTagChips Component', () => {
  let component: RenderResult;
  let props: PlanTagChipsProps;

  beforeEach(() => {
    props = {
      onAddTag: vi.fn(),
      onRemoveTag: vi.fn(),
      tags: [
        {
          confidence: 0.5,
          dimension: 'phase',
          source: 'server-llm',
          tag: 'breakdown',
        },
        {
          confidence: null,
          dimension: 'domain',
          source: 'human',
          tag: 'github',
        },
      ],
      vocabulary: [
        { dimension: 'phase', tag: 'breakdown' },
        { dimension: 'domain', tag: 'github' },
        { dimension: 'domain', tag: 'terraform' },
      ],
    };

    component = render(<PlanTagChips {...props} />);
  });

  test('renders chips with provenance on hover and the phase marker', () => {
    expect(component.getByText('breakdown')).toBeInTheDocument();
    expect(component.getByText('phase')).toBeInTheDocument();
    expect(
      component.getByTitle('server-llm · confidence 0.5'),
    ).toBeInTheDocument();
    expect(component.getByTitle('human')).toBeInTheDocument();
  });

  test('offers removal for every chip (human caller outranks all sources)', async () => {
    const user = userEvent.setup();

    await user.click(component.getByLabelText('Remove tag github'));

    expect(props.onRemoveTag).toHaveBeenCalledWith('github');
  });

  test('adds only vocabulary tags not already applied', async () => {
    const user = userEvent.setup();
    const select = component.getByLabelText('Add a tag');

    expect(component.queryByRole('option', { name: 'github' })).toBeNull();
    await user.selectOptions(select, 'terraform');
    await user.click(component.getByRole('button', { name: 'Add' }));

    expect(props.onAddTag).toHaveBeenCalledWith('terraform');
  });
});
