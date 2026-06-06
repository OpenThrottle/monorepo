import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PlanWorkflowConfigHooksValidation } from '../PlanWorkflowConfigHooksValidation';
import type { PlanWorkflowConfigHooksValidationProps } from '../PlanWorkflowConfigHooksValidation';

const renderValidation = (
  props: PlanWorkflowConfigHooksValidationProps,
): ReturnType<typeof render> => {
  const Component = () => <PlanWorkflowConfigHooksValidation {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('PlanWorkflowConfigHooksValidation Component', () => {
  test('renders nothing when validation is ok', () => {
    const { container } = renderValidation({
      validation: { issues: [], ok: true },
    });

    expect(container).toBeEmptyDOMElement();
  });

  test('renders alert with issues when validation fails', () => {
    renderValidation({
      validation: { issues: ['Prompt is required.'], ok: false },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Fix hook configuration',
    );
    expect(screen.getByText('Prompt is required.')).toBeInTheDocument();
  });
});
