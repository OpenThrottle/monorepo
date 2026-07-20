import * as React from 'react';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderRoutesStub } from '../../../../testing/route-fixtures';
import { SkillsToolbar } from '../SkillsToolbar';

describe('SkillsToolbar Component', () => {
  test('renders search input with placeholder and search button', () => {
    renderRoutesStub(<SkillsToolbar />);

    expect(
      screen.getByPlaceholderText('Filter by slug, path, or summary'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByTestId('SkillsToolbar')).toBeInTheDocument();
  });

  test('links to the availability authoring surface', () => {
    renderRoutesStub(<SkillsToolbar />);

    const link = screen.getByRole('link', { name: /Manage availability/i });
    expect(link).toHaveAttribute('href', '/skills/availability');
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
