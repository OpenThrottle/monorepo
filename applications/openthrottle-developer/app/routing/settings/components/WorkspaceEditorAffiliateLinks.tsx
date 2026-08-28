import * as React from 'react';
import clsx from 'clsx';
import { getWorkspaceEditorAffiliateUrl } from '~/routing/settings/config/workspace-editor-affiliate-links';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';

export interface WorkspaceEditorAffiliateLinksProps {
  className?: string;
}

interface EditorAffiliateLink {
  label: string;
  url: string;
}

/**
 * @description Affiliate/referral CTAs rendered as a quiet footer beneath the editor
 * fieldset. Renders one "Get <editor>" link per supported editor that has an affiliate
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
        <p className="text-muted-foreground text-xs" key={editor.label}>
          {WORKSPACE_SETTINGS_COPY.affiliatePromptPrefix}
          {editor.label}
          {WORKSPACE_SETTINGS_COPY.affiliatePromptSuffix}{' '}
          <a
            aria-label={`${WORKSPACE_SETTINGS_COPY.affiliateCtaPrefix}${editor.label}${WORKSPACE_SETTINGS_COPY.affiliateCtaAriaSuffix}`}
            className="text-primary underline underline-offset-4"
            href={editor.url}
            rel="noopener noreferrer sponsored"
            target="_blank"
          >
            {WORKSPACE_SETTINGS_COPY.affiliateCtaPrefix}
            {editor.label}
          </a>
        </p>
      ))}
      <p className="text-muted-foreground text-xs">
        {WORKSPACE_SETTINGS_COPY.affiliateDisclosure}
      </p>
    </div>
  );
};
