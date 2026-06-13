import * as React from 'react';
import { cleanup } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { renderRoutesStub } from '../../../../testing/route-fixtures';
import { SkillsEmpty } from '../SkillsEmpty';
import type { SkillsEmptyProps } from '../SkillsEmpty';
import { SKILLS_EMPTY_COPY } from '~/routing/skills/data/data.copy';

describe('SkillsEmpty Component', () => {
  let props: SkillsEmptyProps;

  beforeEach(() => {
    props = {};
  });

  test('when there is no search shows empty list copy and link to create', () => {
    const component = renderRoutesStub(<SkillsEmpty {...props} />);

    expect(component.getByText(SKILLS_EMPTY_COPY.title)).toBeInTheDocument();
    const link = component.getByRole('link', { name: 'New skill' });
    expect(link).toHaveAttribute('href', '/skills/create');
  });

  describe('when search is active', () => {
    beforeEach(() => {
      cleanup();
      props = { search: 'alpha' };
    });

    test('shows filtered-empty copy and link to clear filters', () => {
      const component = renderRoutesStub(<SkillsEmpty {...props} />);

      expect(
        component.getByText(SKILLS_EMPTY_COPY.searchTitle),
      ).toBeInTheDocument();
      const link = component.getByRole('link', { name: 'Clear filters' });
      expect(link).toHaveAttribute('href', '/skills');
    });
  });
});
