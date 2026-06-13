import * as React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { renderRoutesStub } from '../../../../testing/route-fixtures';
import { SkillsEmpty } from '../SkillsEmpty';
import type { SkillsEmptyProps } from '../SkillsEmpty';

describe('SkillsEmpty Component', () => {
  let props: SkillsEmptyProps;

  beforeEach(() => {
    props = {};
  });

  test('when there is no search shows empty list copy and link to create', () => {
    renderRoutesStub(<SkillsEmpty {...props} />);

    expect(
      screen.getByText(
        'No skills found, create your first skill to get started.',
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'New skill' });
    expect(link).toHaveAttribute('href', '/skills/create');
  });

  describe('when search is active', () => {
    beforeEach(() => {
      cleanup();
      props = { search: 'alpha' };
    });

    test('shows filtered-empty copy and link to clear filters', () => {
      renderRoutesStub(<SkillsEmpty {...props} />);

      expect(
        screen.getByText(
          'No skills found, try clearing the search to see all skills.',
        ),
      ).toBeInTheDocument();
      const link = screen.getByRole('link', { name: 'Clear filters' });
      expect(link).toHaveAttribute('href', '/skills');
    });
  });
});
