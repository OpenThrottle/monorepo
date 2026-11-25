import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { PROJECT_PLANS_COPY } from '~/routing/projects/data/copy';

import type { ProjectPlanAddProps } from '../ProjectPlanAdd';
import { ProjectPlanAdd } from '../ProjectPlanAdd';

describe('ProjectPlanAdd Component', () => {
  let component: RenderResult;
  let props: ProjectPlanAddProps;
  let submitted: Record<string, FormDataEntryValue | null>[];

  beforeEach(() => {
    submitted = [];
    props = {
      plans: [
        { id: 'plan-1', title: 'Alpha' },
        { id: 'plan-2', title: 'Beta' },
      ],
    };

    const Component = () => {
      return <ProjectPlanAdd {...props} />;
    };
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }: { request: Request }) => {
          const formData = await request.formData();
          submitted.push({
            intent: formData.get('intent'),
            planId: formData.get('planId'),
          });
          return {};
        },
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);
  });

  test('disables the add button until a plan is chosen', () => {
    expect(
      component.getByRole('button', { name: PROJECT_PLANS_COPY.addButton }),
    ).toBeDisabled();
  });

  test('offers every candidate plan', () => {
    const select = component.getByRole('combobox', {
      name: PROJECT_PLANS_COPY.addLabel,
    });
    expect(select.querySelectorAll('option')).toHaveLength(3);
  });

  test('submits the addPlanToProject intent with the chosen plan', async () => {
    const user = userEvent.setup();
    await user.selectOptions(
      component.getByRole('combobox', { name: PROJECT_PLANS_COPY.addLabel }),
      'plan-2',
    );
    await user.click(
      component.getByRole('button', { name: PROJECT_PLANS_COPY.addButton }),
    );
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      intent: 'addPlanToProject',
      planId: 'plan-2',
    });
  });
});
