import * as React from 'react';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GLOBAL_TOOLBAR_SEARCH_COPY } from '@openthrottle/react-router-ui-global';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SKILLS_SEARCH_COPY } from '~/routing/skills/data/data.copy';
import { renderRoutesStub } from '../../../../testing/route-fixtures';
import { SkillsToolbar } from '../SkillsToolbar';

// FEATURE_BETA_PREVIEW resolves from process.env at module load, so the real
// export is a frozen `false` under test. Mock it as a getter over a hoisted
// box so a single file can exercise both sides of the gate at render time.
const betaPreview = vi.hoisted(() => ({ enabled: false }));

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-utils')>();

  return {
    ...actual,
    get FEATURE_BETA_PREVIEW() {
      return betaPreview.enabled;
    },
  };
});

describe('SkillsToolbar Component', () => {
  beforeEach(() => {
    betaPreview.enabled = false;
  });

  test('renders the GlobalToolbarSearch control with skills copy', () => {
    renderRoutesStub(<SkillsToolbar />);

    // The shared control owns its own form role=search + labeled searchbox.
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: SKILLS_SEARCH_COPY.ariaLabel }),
    ).toHaveAttribute('placeholder', SKILLS_SEARCH_COPY.placeholder);
    expect(
      screen.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('SkillsToolbar')).toBeInTheDocument();
  });

  describe('beta-gated authoring links', () => {
    test('hides both links when beta preview is disabled', () => {
      renderRoutesStub(<SkillsToolbar />);

      expect(
        screen.queryByRole('link', { name: /Manage availability/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /Manage vocabulary/i }),
      ).not.toBeInTheDocument();
    });

    test('links to the availability authoring surface when beta preview is enabled', () => {
      betaPreview.enabled = true;

      renderRoutesStub(<SkillsToolbar />);

      const link = screen.getByRole('link', { name: /Manage availability/i });
      expect(link).toHaveAttribute('href', '/skills/availability');
    });

    test('links to the tag-vocabulary manager when beta preview is enabled', () => {
      betaPreview.enabled = true;

      renderRoutesStub(<SkillsToolbar />);

      const link = screen.getByRole('link', { name: /Manage vocabulary/i });
      expect(link).toHaveAttribute('href', '/skills/vocabulary');
    });
  });

  test('no longer renders the dead Create-new-skill control', () => {
    renderRoutesStub(<SkillsToolbar />);

    expect(screen.queryByText('Create new skill')).not.toBeInTheDocument();
  });

  describe('source filter (All / OpenThrottle / External)', () => {
    const onSourceFilterChange = vi.fn();

    beforeEach(() => {
      cleanup();
      onSourceFilterChange.mockClear();
    });

    test('renders the three filter segments', () => {
      const component = renderRoutesStub(
        <SkillsToolbar
          onSourceFilterChange={onSourceFilterChange}
          sourceFilter="all"
        />,
      );

      const group = component.getByTestId('skills-source-filter');
      expect(group).toBeInTheDocument();
      expect(component.getByRole('radio', { name: 'All' })).toBeInTheDocument();
      expect(
        component.getByRole('radio', { name: 'OpenThrottle' }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('radio', { name: 'External' }),
      ).toBeInTheDocument();
    });

    test('marks the active segment from the sourceFilter prop', () => {
      const component = renderRoutesStub(
        <SkillsToolbar
          onSourceFilterChange={onSourceFilterChange}
          sourceFilter="openthrottle"
        />,
      );

      expect(
        component.getByRole('radio', { name: 'OpenThrottle' }),
      ).toHaveAttribute('aria-checked', 'true');
      expect(component.getByRole('radio', { name: 'All' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    test('emits the selected filter on click', async () => {
      const user = userEvent.setup();
      const component = renderRoutesStub(
        <SkillsToolbar
          onSourceFilterChange={onSourceFilterChange}
          sourceFilter="all"
        />,
      );

      await user.click(component.getByRole('radio', { name: 'External' }));

      expect(onSourceFilterChange).toHaveBeenCalledTimes(1);
      expect(onSourceFilterChange).toHaveBeenCalledWith('external');
    });

    test('re-clicking the active segment keeps the selection (no empty emit)', async () => {
      const user = userEvent.setup();
      const component = renderRoutesStub(
        <SkillsToolbar
          onSourceFilterChange={onSourceFilterChange}
          sourceFilter="external"
        />,
      );

      await user.click(component.getByRole('radio', { name: 'External' }));

      expect(onSourceFilterChange).not.toHaveBeenCalled();
    });
  });
});
