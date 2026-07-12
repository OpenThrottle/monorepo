import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { SkillAvailabilityRulesEditor } from '../SkillAvailabilityRulesEditor';
import type { SkillAvailabilityRulesEditorProps } from '../SkillAvailabilityRulesEditor';

const renderEditor = (
  props: SkillAvailabilityRulesEditorProps,
): RenderResult => {
  const Stub = createRoutesStub([
    {
      Component: () => (
        <TooltipProvider>
          <SkillAvailabilityRulesEditor {...props} />
        </TooltipProvider>
      ),
      action: async () => ({ ok: true }),
      path: '/skills/availability',
    },
  ]);
  return render(<Stub initialEntries={['/skills/availability']} />);
};

describe('SkillAvailabilityRulesEditor Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('shows the empty note and the trailing add form when there are no rules', () => {
    const component = renderEditor({ rules: [], vocabulary: ['github'] });

    expect(
      component.getByTestId('SkillAvailabilityRulesEditor'),
    ).toBeInTheDocument();
    expect(component.getByText(/No rules yet/i)).toBeInTheDocument();
    // The add form is always present.
    expect(
      component.getByRole('button', { name: /^Add rule$/i }),
    ).toBeInTheDocument();
  });

  test('renders one editable form per saved rule plus the add form', () => {
    const component = renderEditor({
      rules: [
        {
          environment: 'ralph',
          id: 'rule-1',
          slugAllow: [],
          slugDeny: [],
          tagAllow: ['github'],
          tagDeny: [],
        },
      ],
      vocabulary: ['github'],
    });

    // One edit form (Save rule) + one add form (Add rule).
    expect(
      component.getByRole('button', { name: /^Save rule$/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /^Add rule$/i }),
    ).toBeInTheDocument();
    expect(
      component.getAllByRole('button', { name: /Remove rule/i }).length,
    ).toBeGreaterThan(0);
  });
});
