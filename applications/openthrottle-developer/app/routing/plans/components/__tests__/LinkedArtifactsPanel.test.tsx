import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { LinkedArtifactsPanel } from '../LinkedArtifactsPanel';
import type {
  LinkedArtifactRow,
  LinkedArtifactsPanelProps,
} from '../LinkedArtifactsPanel';

const artifact = (
  overrides: Partial<LinkedArtifactRow>,
): LinkedArtifactRow => ({
  externalKey: 'github:o/r@abc',
  id: 'art-1',
  lifecycle: 'created',
  producedAt: '2026-07-13T00:00:00.000Z',
  source: 'agent',
  type: 'git_commit',
  verification: 'unverified',
  ...overrides,
});

const renderPanel = (props: LinkedArtifactsPanelProps): RenderResult => {
  const Component = () => <LinkedArtifactsPanel {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('LinkedArtifactsPanel Component', () => {
  let component: RenderResult;

  describe('with artifacts', () => {
    beforeEach(() => {
      component = renderPanel({
        artifacts: [
          // Mixed Date-scalar shapes: epoch-millis number and ISO string (the scalar arrives as either).
          artifact({
            id: 'a1',
            producedAt: 1_752_000_000_000,
            type: 'git_commit',
            verification: 'verified',
          }),
          artifact({
            id: 'a2',
            producedAt: '2026-07-13T00:00:00.000Z',
            type: 'document',
            verification: 'orphaned',
          }),
        ],
      });
    });

    test('renders the panel with a row per artifact (mixed date scalar shapes)', () => {
      expect(component.getByTestId('LinkedArtifactsPanel')).toBeInTheDocument();
      expect(component.getByText('verified')).toBeInTheDocument();
      expect(component.getByText('orphaned')).toBeInTheDocument();
      expect(component.getByText('git_commit')).toBeInTheDocument();
      expect(component.getByText('document')).toBeInTheDocument();
    });
  });

  describe('with no artifacts', () => {
    test('renders nothing (returns null)', () => {
      const { container } = renderPanel({ artifacts: [] });
      expect(container).toBeEmptyDOMElement();
    });
  });
});
