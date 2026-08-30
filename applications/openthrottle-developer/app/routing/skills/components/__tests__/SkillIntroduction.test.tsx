import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  SKILL_DETAIL_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
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
      canEdit: true,
      editDisabledTooltip: SKILL_DETAIL_COPY.editDisabledTooltip,
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

  test('renders the bare slug heading, badges, and path', () => {
    expect(component.getByTestId('SkillIntroduction')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 1, name: baseEntry.slug }),
    ).toBeInTheDocument();
    expect(
      component.getByText(SKILLS_SOURCE_COPY.externalLabel),
    ).toBeInTheDocument();
    expect(component.getByText('Default (auto)')).toBeInTheDocument();
    expect(component.getByText(baseEntry.repoRelativePath)).toBeInTheDocument();
  });

  test('leaves the summary to the Skill tab', () => {
    // The Skill tab renders the whole SKILL.md; repeating the summary in the
    // chrome was the duplication this layout removed.
    expect(component.queryByText(String(baseEntry.summary))).toBeNull();
  });

  test('renders skill tags below the heading, not on the title row', () => {
    component.unmount();
    props = { ...props, entry: { ...baseEntry, tags: ['docs', 'git'] } };
    component = renderIntroduction();

    const metadata = component.getByTestId('skill-introduction-metadata');

    expect(metadata).toHaveAttribute(
      'aria-label',
      SKILL_DETAIL_COPY.metadataLabel,
    );
    expect(metadata).toHaveTextContent('docs');
    expect(metadata).toHaveTextContent('git');
    expect(
      component.getByRole('heading', { level: 1, name: baseEntry.slug }),
    ).not.toHaveTextContent('docs');
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

  test('renders the disabled Edit affordance with the supplied reason', () => {
    component.unmount();
    props = {
      ...props,
      canEdit: false,
      editDisabledTooltip: SKILL_DETAIL_COPY.editExternalTooltip,
    };
    component = renderIntroduction();

    expect(component.queryByTestId('skill-edit-button')).toBeNull();
    expect(component.getByTestId('skill-edit-disabled')).toBeInTheDocument();
  });

  test('keeps the tag chips and run control live when editing is blocked', () => {
    component.unmount();
    props = {
      ...props,
      canEdit: false,
      editDisabledTooltip: SKILL_DETAIL_COPY.editExternalTooltip,
      onAddTag: vi.fn(),
      onRemoveTag: vi.fn(),
      tagVocabulary: [{ dimension: 'domain', tag: 'docs' }],
    };
    component = renderIntroduction();

    // Record-level tags and running are DB rows / runtime, not SKILL.md content
    // — the read-only gate must not reach them.
    expect(component.getByTestId('skill-run-now')).toBeInTheDocument();
    expect(component.getByTestId('skill-edit-disabled')).toBeInTheDocument();
  });

  test('renders the path copy control as a single button', () => {
    // OpenThrottleClipboard is itself a <button>; wrapping it in another one
    // is invalid HTML and fails hydration on every skill detail page.
    const copy = component.getByRole('button', {
      name: SKILL_DETAIL_COPY.pathCopyLabel,
    });

    expect(copy.querySelector('button')).toBeNull();
  });

  test('drops the path row for a DB-only orphan', () => {
    component.unmount();
    props = {
      ...props,
      entry: {
        ...baseEntry,
        orphanedAt: new Date(0),
        repoRelativePath: '',
      },
      onRemoveOrphan: vi.fn(),
    };
    component = renderIntroduction();

    // An orphan has no path, so a Copy path button would copy an empty string.
    expect(
      component.queryByRole('button', {
        name: SKILL_DETAIL_COPY.pathCopyLabel,
      }),
    ).toBeNull();
    expect(component.getByTestId('skill-orphan-badge')).toBeInTheDocument();
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
