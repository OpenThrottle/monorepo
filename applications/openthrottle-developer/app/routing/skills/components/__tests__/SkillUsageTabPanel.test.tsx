import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { SkillDetailUsageData } from '~/routing/skills/data/skill-usage-detail';
import { SKILL_USAGE_DETAIL_COPY } from '~/routing/skills/data/data.copy';
import { SkillUsageTabPanel } from '../SkillUsageTabPanel';

const renderPanel = (usage: Promise<SkillDetailUsageData>): RenderResult => {
  const Component = () => <SkillUsageTabPanel usage={usage} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillUsageTabPanel Component', () => {
  test('resolves the deferred usage into the usage card', async () => {
    const component = renderPanel(
      Promise.resolve({ available: true, byDay: [], skill: null }),
    );

    await waitFor(() => {
      expect(
        component.getByText(SKILL_USAGE_DETAIL_COPY.emptyNotice),
      ).toBeInTheDocument();
    });
  });

  test('renders the unavailable notice for the sentinel', async () => {
    const component = renderPanel(Promise.resolve({ available: false }));

    await waitFor(() => {
      expect(
        component.getByText(SKILL_USAGE_DETAIL_COPY.unavailableNotice),
      ).toBeInTheDocument();
    });
  });
});
