import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILLS_SOURCE_COPY } from '~/routing/skills/data/data.copy';
import { getModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';
import { SkillIntroduction } from '../SkillIntroduction';
import type { SkillIntroductionProps } from '../SkillIntroduction';

const baseEntry: RepoSkillEntry = {
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
  slug: 'brag-sheet',
  source: 'external',
  summary: 'Vendored skill.',
  tags: undefined,
};

describe('SkillIntroduction Component', () => {
  let component: RenderResult;
  let props: SkillIntroductionProps;

  const renderIntroduction = (): RenderResult => {
    const Component = () => (
      <TooltipProvider>
        <SkillIntroduction {...props} />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      editable: true,
      entry: baseEntry,
      invocationBadge: getModelInvocationBadge(undefined),
      isDirty: false,
      isEditing: false,
      isOpenThrottle: false,
      onCancel: vi.fn(),
      onEdit: vi.fn(),
      onRun: undefined,
      onSave: vi.fn(),
      runOptions: undefined,
      saveError: undefined,
      saving: false,
      sourceTooltip: SKILLS_SOURCE_COPY.externalTooltip,
    };

    component = renderIntroduction();
  });

  test('renders title, badges, summary, and path', () => {
    expect(component.getByTestId('SkillIntroduction')).toBeInTheDocument();
    expect(component.getByText('/brag-sheet')).toBeInTheDocument();
    expect(
      component.getByText(SKILLS_SOURCE_COPY.externalLabel),
    ).toBeInTheDocument();
    expect(component.getByText('Default (auto)')).toBeInTheDocument();
    expect(component.getByText('Vendored skill.')).toBeInTheDocument();
    expect(
      component.getByText('.agents/skills/brag-sheet/SKILL.md'),
    ).toBeInTheDocument();
  });

  test('renders skill tags', () => {
    component.unmount();
    props = { ...props, entry: { ...baseEntry, tags: ['docs', 'git'] } };
    component = renderIntroduction();

    expect(component.getByText('docs')).toBeInTheDocument();
    expect(component.getByText('git')).toBeInTheDocument();
  });

  test('links the external source badge to its sourceUrl', () => {
    component.unmount();
    props = {
      ...props,
      entry: {
        ...baseEntry,
        sourceUrl: 'https://example.com/skills/brag-sheet',
      },
    };
    component = renderIntroduction();

    expect(component.getByTestId('skill-source-link')).toHaveAttribute(
      'href',
      'https://example.com/skills/brag-sheet',
    );
  });

  test('renders an unlinked OpenThrottle badge for owned skills', () => {
    component.unmount();
    props = {
      ...props,
      entry: { ...baseEntry, slug: 'ot-plans', source: 'openthrottle' },
      isOpenThrottle: true,
      sourceTooltip: SKILLS_SOURCE_COPY.openthrottleTooltip,
    };
    component = renderIntroduction();

    expect(
      component.getByText(SKILLS_SOURCE_COPY.openthrottleLabel),
    ).toBeInTheDocument();
    expect(component.queryByTestId('skill-source-link')).toBeNull();
  });
});
