import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { LinkedArtifactGroupProps } from '../LinkedArtifactGroup';
import { LinkedArtifactGroup } from '../LinkedArtifactGroup';
import type { LinkedArtifactRow } from '../LinkedArtifactsPanel';

const artifact = (id: string): LinkedArtifactRow => ({
  createdAt: '2026-07-13T00:00:00.000Z',
  externalKey: `key:${id}`,
  id,
  lifecycle: null,
  message: null,
  payloadJson: '{}',
  producedAt: '2026-07-13T00:00:00.000Z',
  sessionId: 'sess-1',
  source: 'agent',
  type: 'status_change',
  verification: 'verified',
  verifiedAt: null,
});

const renderGroup = (
  overrides: Partial<LinkedArtifactGroupProps> = {},
): RenderResult => {
  const rows = overrides.rows ?? [artifact('a'), artifact('b')];
  const props: LinkedArtifactGroupProps = {
    collapsedByDefault: false,
    count: rows.length,
    label: 'Status changes',
    renderRow: (row) => <span>{row.id}</span>,
    rows,
    ...overrides,
  };

  const Component = () => <LinkedArtifactGroup {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('LinkedArtifactGroup Component', () => {
  test('renders the group header with its label and count', () => {
    const component = renderGroup();

    expect(component.getByTestId('LinkedArtifactGroup')).toBeInTheDocument();
    expect(component.getByText('Status changes')).toBeInTheDocument();
    expect(component.getByText('2')).toBeInTheDocument();
  });

  test('shows every row when the group opens expanded', () => {
    const component = renderGroup();

    expect(component.getByText('a')).toBeInTheDocument();
    expect(component.getByText('b')).toBeInTheDocument();
  });

  describe('when collapsed by default', () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      artifact(`row-${index}`),
    );

    test('previews only the most recent rows and counts the remainder', () => {
      const component = renderGroup({ collapsedByDefault: true, rows });

      expect(component.getByText('row-0')).toBeInTheDocument();
      expect(component.getByText('row-1')).toBeInTheDocument();
      expect(component.queryByText('row-4')).not.toBeInTheDocument();
      expect(component.getByText(/\+3/)).toBeInTheDocument();
    });

    test('reveals the full list once the disclosure is opened', async () => {
      const user = userEvent.setup();
      const component = renderGroup({ collapsedByDefault: true, rows });

      await user.click(component.getByText('Status changes'));

      expect(component.getByText('row-4')).toBeInTheDocument();
    });
  });

  test('renders nothing for an empty group', () => {
    const { container } = renderGroup({ count: 0, rows: [] });

    expect(container).toBeEmptyDOMElement();
  });
});
