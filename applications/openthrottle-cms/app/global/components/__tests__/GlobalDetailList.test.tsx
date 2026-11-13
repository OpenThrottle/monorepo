import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { GlobalDetailList } from '~/global/components/GlobalDetailList';
import {
  GLOBAL_TABLE_COLUMN_KIND,
  GLOBAL_TABLE_COPY,
} from '~/global/data/data.global-table';
import type { GlobalDetailField } from '~/global/types/global-detail-list';

interface Row {
  readonly name: string;
  readonly status: string | null;
  readonly uuid: string;
}

const FIELDS: readonly GlobalDetailField<Row>[] = [
  { key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT, label: 'Name' },
  { key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE, label: 'Status' },
  { key: 'uuid', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'UUID' },
];

describe('GlobalDetailList', () => {
  it('renders one dt and dd per field with the label in the dt', () => {
    const component = render(
      <GlobalDetailList
        className={undefined}
        fields={FIELDS}
        record={{ name: 'Home', status: 'draft', uuid: 'abc-123' }}
      />,
    );

    const terms = component.container.querySelectorAll('dt');
    expect(component.container.querySelectorAll('dd')).toHaveLength(3);
    expect(Array.from(terms).map((term) => term.textContent)).toEqual([
      'Name',
      'Status',
      'UUID',
    ]);
  });

  it('renders values with the cell kind', () => {
    const component = render(
      <GlobalDetailList
        className={undefined}
        fields={FIELDS}
        record={{ name: 'Home', status: 'draft', uuid: 'abc-123' }}
      />,
    );

    expect(component.getByText('abc-123').tagName).toBe('CODE');
    expect(component.getByText('Home')).toBeInTheDocument();
  });

  it('renders the placeholder for a missing value', () => {
    const component = render(
      <GlobalDetailList
        className={undefined}
        fields={FIELDS}
        record={{ name: 'Home', status: null, uuid: 'abc-123' }}
      />,
    );

    expect(component.getByText(GLOBAL_TABLE_COPY.missing)).toBeInTheDocument();
  });

  it('passes className to the list', () => {
    const component = render(
      <GlobalDetailList
        className="custom-class"
        fields={FIELDS}
        record={{ name: 'Home', status: 'draft', uuid: 'abc-123' }}
      />,
    );

    expect(component.getByTestId('GlobalDetailList')).toHaveClass(
      'custom-class',
    );
  });
});
