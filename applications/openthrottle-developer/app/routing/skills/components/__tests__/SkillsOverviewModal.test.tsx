import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsOverviewModal } from '../SkillsOverviewModal';
import type { SkillsOverviewModalProps } from '../SkillsOverviewModal';

function renderWithProps(
  props: SkillsOverviewModalProps,
  initialEntries: readonly string[],
) {
  const Component = () => <SkillsOverviewModal {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[...initialEntries]} />);
}

describe('SkillsOverviewModal Component', () => {
  describe('when modal search param matches', () => {
    beforeEach(() => {
      renderWithProps({}, ['/?modal=overview']);
    });

    test('renders modal heading copy', () => {
      expect(
        screen.getAllByRole('heading', {
          level: 2,
          name: 'SkillsOverviewModal',
        }).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('when modal search param does not match', () => {
    test('does not surface modal heading in the accessible tree', () => {
      renderWithProps({}, ['/']);

      expect(
        screen.queryByRole('heading', { name: 'SkillsOverviewModal' }),
      ).not.toBeInTheDocument();
    });
  });
});
