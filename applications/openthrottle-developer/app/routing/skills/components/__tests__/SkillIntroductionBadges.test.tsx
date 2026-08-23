import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILLS_SOURCE_COPY } from '~/routing/skills/data/data.copy';
import { getModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';
import { SkillIntroductionBadges } from '../SkillIntroductionBadges';
import type { SkillIntroductionBadgesProps } from '../SkillIntroductionBadges';

const baseEntry: RepoSkillEntry = {
  arguments: undefined,
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
  slug: 'brag-sheet',
  source: 'external',
  summary: 'Vendored skill.',
  tags: undefined,
};

describe('SkillIntroductionBadges Component', () => {
  let component: RenderResult;
  let props: SkillIntroductionBadgesProps;

  const renderBadges = (): RenderResult => {
    const Component = () => (
      <TooltipProvider>
        <SkillIntroductionBadges {...props} />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      entry: baseEntry,
      invocationBadge: getModelInvocationBadge(undefined),
      isOpenThrottle: false,
      showReadOnlyTags: false,
      sourceTooltip: SKILLS_SOURCE_COPY.externalTooltip,
    };

    component = renderBadges();
  });

  test('renders the external source badge and the invocation badge', () => {
    expect(component.getByTestId('skill-source-badge')).toHaveTextContent(
      SKILLS_SOURCE_COPY.externalLabel,
    );
    expect(component.getByText('Default (auto)')).toBeInTheDocument();
  });

  test('links the source badge out when the entry carries a sourceUrl', () => {
    component.unmount();
    props = {
      ...props,
      entry: {
        ...baseEntry,
        sourceUrl: 'https://example.com/skills/brag-sheet',
      },
    };
    component = renderBadges();

    expect(component.getByTestId('skill-source-link')).toHaveAttribute(
      'href',
      'https://example.com/skills/brag-sheet',
    );
  });

  test('leaves an OpenThrottle badge unlinked', () => {
    component.unmount();
    props = {
      ...props,
      entry: { ...baseEntry, source: 'openthrottle' },
      isOpenThrottle: true,
      sourceTooltip: SKILLS_SOURCE_COPY.openthrottleTooltip,
    };
    component = renderBadges();

    expect(component.getByTestId('skill-source-badge')).toHaveTextContent(
      SKILLS_SOURCE_COPY.openthrottleLabel,
    );
    expect(component.queryByTestId('skill-source-link')).toBeNull();
  });

  test('renders read-only tag badges only when asked to', () => {
    component.unmount();
    props = {
      ...props,
      entry: { ...baseEntry, tags: ['docs', 'git'] },
      showReadOnlyTags: true,
    };
    component = renderBadges();

    expect(component.getByText('docs')).toBeInTheDocument();
    expect(component.getByText('git')).toBeInTheDocument();
  });

  test('omits the tag badges when the chips own tag display', () => {
    component.unmount();
    props = {
      ...props,
      entry: { ...baseEntry, tags: ['docs'] },
      showReadOnlyTags: false,
    };
    component = renderBadges();

    expect(component.queryByText('docs')).toBeNull();
  });
});
