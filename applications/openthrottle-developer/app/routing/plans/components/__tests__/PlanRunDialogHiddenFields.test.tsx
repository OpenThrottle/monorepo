import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { PlanRunDialogHiddenFieldsProps } from '../PlanRunDialogHiddenFields';
import { PlanRunDialogHiddenFields } from '../PlanRunDialogHiddenFields';

describe('PlanRunDialogHiddenFields Component', () => {
  let component: RenderResult;
  let props: PlanRunDialogHiddenFieldsProps;

  beforeEach(() => {
    props = { fields: { branch: 'main', intent: 'runPlan' } };

    const Component = (): React.ReactElement => {
      return <PlanRunDialogHiddenFields {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders one hidden input per field with its value', () => {
    expect(component.getByTestId('PlanRunDialog-field-branch')).toHaveValue(
      'main',
    );
    expect(component.getByTestId('PlanRunDialog-field-intent')).toHaveValue(
      'runPlan',
    );
  });
});
