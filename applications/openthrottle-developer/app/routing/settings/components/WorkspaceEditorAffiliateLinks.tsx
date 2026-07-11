import * as React from 'react';
import clsx from 'clsx';
import { getWorkspaceEditorAffiliateUrl } from '~/routing/settings/config/workspace-editor-affiliate-links';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';

export interface WorkspaceEditorAffiliateLinksProps {
  className?: string;
}

interface EditorAffiliateLink {
  label: string;
  url: string;
}

/**
 * @description Affiliate/referral CTAs shown beneath the editor multi-select.
 * Renders one "Get <editor>" link per supported editor that has an affiliate
 * URL configured (VS Code has none, so it is omitted), plus a single FTC-style
 * disclosure. Returns null when no editor has an affiliate URL.
 */
export const WorkspaceEditorAffiliateLinks = (
  props: WorkspaceEditorAffiliateLinksProps,
): React.ReactElement | null => {
  const { className } = props;

  // Hooks

  // Setup
  const editorsWithLinks: EditorAffiliateLink[] =
    WORKSPACE_EDITOR_OPTIONS.reduce<EditorAffiliateLink[]>((acc, option) => {
      const url = getWorkspaceEditorAffiliateUrl(option.value);
      return url === null ? acc : [...acc, { label: option.label, url }];
    }, []);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (editorsWithLinks.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx('space-y-1', className)}
      data-testid="WorkspaceEditorAffiliateLinks"
    >
      {editorsWithLinks.map((editor) => (
        <p className="text-muted-foreground text-sm" key={editor.label}>
          Don’t have {editor.label} yet?{' '}
          <a
            aria-label={`Get ${editor.label} (affiliate link, opens in a new tab)`}
            className="text-primary underline underline-offset-4"
            href={editor.url}
            rel="noopener noreferrer sponsored"
            target="_blank"
          >
            Get {editor.label}
          </a>
        </p>
      ))}
      <p className="text-muted-foreground text-xs">
        Some editor links above are affiliate/referral links. OpenThrottle may
        earn a commission if you sign up through them, at no extra cost to you.
      </p>
    </div>
  );
};
