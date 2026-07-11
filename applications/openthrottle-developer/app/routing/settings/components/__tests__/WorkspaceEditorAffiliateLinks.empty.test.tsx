import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { WorkspaceEditorAffiliateLinks } from '../WorkspaceEditorAffiliateLinks';

// Force every editor to have no affiliate URL to prove the UI degrades cleanly.
vi.mock('~/routing/settings/config/workspace-editor-affiliate-links', () => ({
  WORKSPACE_EDITOR_AFFILIATE_LINKS: {},
  getWorkspaceEditorAffiliateUrl: () => null,
}));

describe('WorkspaceEditorAffiliateLinks with no configured URLs', () => {
  test('renders nothing when no editor has an affiliate URL', () => {
    const { container } = render(<WorkspaceEditorAffiliateLinks />);

    expect(container).toBeEmptyDOMElement();
  });
});
