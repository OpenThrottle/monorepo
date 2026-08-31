import * as React from 'react';
import clsx from 'clsx';
import { Editor } from '@openthrottle/react-router-editor';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILL_DETAIL_COPY } from '~/routing/skills/data/data.copy';

export interface SkillDetailProps {
  className?: string;
  /** Raw SKILL.md content; empty renders the unreadable-file notice. */
  content: string;
  /** Controlled editor draft while `isEditing` is true. */
  draft: string;
  entry: RepoSkillEntry;
  isEditing: boolean;
  /** Editor `onChange`; ignored in read mode. */
  onDraftChange: (value: string | undefined) => void;
}

export const SkillDetail = (props: SkillDetailProps): React.ReactElement => {
  const { className, content, draft, entry, isEditing, onDraftChange } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col gap-4', className)}
      data-testid="SkillDetail"
    >
      {isEditing ? (
        <div
          className="ui-border flex h-[70vh] flex-col overflow-hidden rounded-lg border"
          data-testid="skill-editor"
        >
          <Editor
            language="markdown"
            onChange={onDraftChange}
            path={entry.repoRelativePath}
            showSidebar={false}
            showTabs={false}
            showToolbar={false}
            value={draft}
          />
        </div>
      ) : (
        <div className="bg-card ui-border rounded-lg border p-6">
          {content.length > 0 ? (
            <MarkdownRenderer source={content} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {SKILL_DETAIL_COPY.emptyContentNotice}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
