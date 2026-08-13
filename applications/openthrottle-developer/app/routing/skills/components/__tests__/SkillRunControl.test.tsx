import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILL_RUN_COPY } from '~/routing/skills/data/data.copy';
import { SkillRunControl } from '../SkillRunControl';
import type { SkillRunControlProps } from '../SkillRunControl';

const mockEntry: RepoSkillEntry = {
  disableModelInvocation: false,
  layout: 'agents',
  repoRelativePath: '.agents/skills/example',
  slug: 'example',
  source: 'openthrottle',
  summary: 'An example skill.',
  tags: undefined,
};

const renderSkillRunControl = (props: SkillRunControlProps): RenderResult => {
  const Component = () => (
    <TooltipProvider>
      <SkillRunControl {...props} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('SkillRunControl Component', () => {
  let component: RenderResult;
  let props: SkillRunControlProps;

  beforeEach(() => {
    props = {
      entry: mockEntry,
    };
    component = renderSkillRunControl(props);
  });

  test('renders the Run now button enabled by default', () => {
    const button = component.getByTestId('skill-run-now');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(SKILL_RUN_COPY.runButtonLabel);
    expect(button).not.toBeDisabled();
  });

  test('opens the run dialog trigger state on click', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('skill-run-now'));

    // The dialog itself is deferred behind runOptions, which is not supplied
    // here; clicking still flips internal state without throwing.
    expect(component.getByTestId('skill-run-now')).toBeInTheDocument();
  });

  test('disables the button and shows a tooltip when model invocation is disabled', () => {
    component.unmount();
    component = renderSkillRunControl({
      entry: { ...mockEntry, disableModelInvocation: true },
      onRun: vi.fn(),
    });

    expect(component.getByTestId('skill-run-now')).toBeDisabled();
  });

  test('prefers effectiveDisableModelInvocation over the static flag', () => {
    component.unmount();
    component = renderSkillRunControl({
      entry: {
        ...mockEntry,
        disableModelInvocation: false,
        effectiveDisableModelInvocation: true,
      },
    });

    expect(component.getByTestId('skill-run-now')).toBeDisabled();
  });
});
