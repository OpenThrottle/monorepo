import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceEditorAffiliateLinks } from '../WorkspaceEditorAffiliateLinks';

describe('WorkspaceEditorAffiliateLinks Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(<WorkspaceEditorAffiliateLinks />);
  });

  test('renders the Cursor affiliate link with sponsored, new-tab attributes', () => {
    const link = component.getByRole('link', { name: /get cursor/i });

    expect(link).toHaveAttribute(
      'href',
      'https://cursor.com/referral?code=TATK4GNIDWSM',
    );
    expect(link).toHaveAttribute('rel', 'noopener noreferrer sponsored');
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('uses descriptive link text and an accessible label', () => {
    const link = component.getByRole('link', { name: /get cursor/i });

    expect(link).toHaveTextContent('Get Cursor');
    expect(link).toHaveAttribute(
      'aria-label',
      'Get Cursor (affiliate link, opens in a new tab)',
    );
  });

  test('does not render a link for VS Code (no affiliate program)', () => {
    expect(
      component.queryByText(/get visual studio code/i),
    ).not.toBeInTheDocument();
  });

  test('renders an FTC-style affiliate disclosure', () => {
    expect(
      component.getByText(/affiliate\/referral links/i),
    ).toBeInTheDocument();
    expect(component.getByText(/no extra cost to you/i)).toBeInTheDocument();
  });
});
