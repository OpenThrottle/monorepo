import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { GlobalTableCell } from '~/global/components/GlobalTableCell';
import {
  GLOBAL_TABLE_COLUMN_KIND,
  GLOBAL_TABLE_COPY,
} from '~/global/data/data.global-table';

describe('GlobalTableCell', () => {
  describe('text', () => {
    it('renders strings and numbers', () => {
      const component = render(
        <GlobalTableCell
          className={undefined}
          kind={GLOBAL_TABLE_COLUMN_KIND.TEXT}
          value={42}
        />,
      );

      expect(component.getByText('42')).toBeInTheDocument();
    });

    it('renders the placeholder for null', () => {
      const component = render(
        <GlobalTableCell
          className={undefined}
          kind={GLOBAL_TABLE_COLUMN_KIND.TEXT}
          value={null}
        />,
      );

      expect(
        component.getByText(GLOBAL_TABLE_COPY.missing),
      ).toBeInTheDocument();
    });
  });

  describe('date', () => {
    it('renders a time element for a valid date string', () => {
      const component = render(
        <GlobalTableCell
          className={undefined}
          kind={GLOBAL_TABLE_COLUMN_KIND.DATE}
          value="2026-11-12T12:00:00.000Z"
        />,
      );

      expect(component.container.querySelector('time')).toHaveAttribute(
        'dateTime',
        '2026-11-12T12:00:00.000Z',
      );
    });

    it('renders the placeholder for an invalid date', () => {
      const component = render(
        <GlobalTableCell
          className={undefined}
          kind={GLOBAL_TABLE_COLUMN_KIND.DATE}
          value="not a date"
        />,
      );

      expect(
        component.getByText(GLOBAL_TABLE_COPY.missing),
      ).toBeInTheDocument();
    });
  });

  describe('list', () => {
    it('renders one badge per string item', () => {
      const component = render(
        <GlobalTableCell
          className={undefined}
          kind={GLOBAL_TABLE_COLUMN_KIND.LIST}
          value={['marketing', 'home']}
        />,
      );

      expect(component.getByText('marketing')).toBeInTheDocument();
      expect(component.getByText('home')).toBeInTheDocument();
    });

    it('renders the placeholder for an empty list', () => {
      const component = render(
        <GlobalTableCell
          className={undefined}
          kind={GLOBAL_TABLE_COLUMN_KIND.LIST}
          value={[]}
        />,
      );

      expect(
        component.getByText(GLOBAL_TABLE_COPY.missing),
      ).toBeInTheDocument();
    });
  });

  describe('code', () => {
    it('renders a code element', () => {
      const component = render(
        <GlobalTableCell
          className={undefined}
          kind={GLOBAL_TABLE_COLUMN_KIND.CODE}
          value="Hero"
        />,
      );

      expect(component.getByText('Hero').tagName).toBe('CODE');
    });
  });
});
