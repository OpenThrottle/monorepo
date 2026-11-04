import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { LinkedArtifactsPanelSkeleton } from '../LinkedArtifactsPanelSkeleton';

describe('LinkedArtifactsPanelSkeleton Component', () => {
  test('renders a busy placeholder distinct from the output-stream skeleton', () => {
    const component = render(<LinkedArtifactsPanelSkeleton />);
    const skeleton = component.getByTestId('LinkedArtifactsPanelSkeleton');

    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });
});
