import * as React from 'react';
import {
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleTabs } from '@openthrottle/react-router-ui';
import { FileTextIcon, GaugeIcon } from 'lucide-react';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { RunSkillPayload } from '~/routing/skills/components/RunSkillDialog';
import { SkillDetail } from '~/routing/skills/components/SkillDetail';
import { SkillIntroduction } from '~/routing/skills/components/SkillIntroduction';
import { SkillUsageTabPanel } from '~/routing/skills/components/SkillUsageTabPanel';
import type { RunSkillRunOptions } from '~/routing/skills/components/SkillRunControl';
import type { SkillTagVocabularyOption } from '~/routing/skills/components/SkillTagChips';
import type { SkillDetailUsageData } from '~/routing/skills/data/skill-usage-detail';
import { useSkillDetail } from '~/routing/skills/hooks/useSkillDetail';
import {
  SKILLS_DETAIL_TAB_SEARCH_PARAM,
  parseSkillDetailTab,
} from '~/routing/skills/utils/parse-skill-detail-tab';

export interface SkillDetailTabsProps {
  /** SKILL.md body (frontmatter stripped) rendered in read mode; empty renders the unreadable-file notice. */
  content: string;
  /**
   * Local checkout with a resolved monorepo root. This is the precondition only
   * — editing also requires writable provenance: OpenThrottle-authored, custom
   * (repo-authored) or personal. A lockfile-installed external skill is the one
   * read-only case (see `canEdit` in the hook).
   */
  editable: boolean;
  entry: RepoSkillEntry;
  /** Adds a tag to this skill record; enables the editable tag chips. */
  onAddTag?: (tag: string) => void;
  /** Clears the orphaned marker on this skill record. */
  onRemoveOrphan?: () => void;
  /** Removes a tag from this skill record. */
  onRemoveTag?: (tag: string) => void;
  /** Composed run payload from the Run-skill modal; wired to the run mechanism. */
  onRun?: (payload: RunSkillPayload) => void;
  /** Invoked with the full draft on Save; wired to the route action. */
  onSave?: (draft: string) => void;
  /**
   * The untouched SKILL.md (frontmatter included) that seeds the editor, so a
   * save round-trips the whole file instead of the stripped `content`.
   */
  rawContent: string;
  /** Deferred agent+model+repository options for the Run-skill modal. */
  runOptions?: Promise<RunSkillRunOptions>;
  /** Action-side rejection message, shown inline next to Save. */
  saveError?: string;
  /** True while a save is submitting; disables Save/Cancel. */
  saving?: boolean;
  /** True while a tag/orphan mutation is submitting; disables tag controls. */
  tagPending?: boolean;
  /** Available tag vocabulary; enables the editable tag chips when provided. */
  tagVocabulary?: readonly SkillTagVocabularyOption[];
  /** Deferred per-skill usage; streamed inside the Usage tab (RR8 Single Fetch). */
  usage: Promise<SkillDetailUsageData>;
}

/**
 * @description Tabbed body for the /skills/:slug detail route: a shared
 * {@link SkillIntroduction} above the tabs, a `Skill` tab (the SKILL.md
 * view/editor) and a `Usage` tab (the deferred per-skill usage card). Mirrors
 * the plan detail route's OpenThrottleTabs + urlSync so the active tab syncs
 * to the `tab` search param; the shared `useUrlSyncedTabValue` handles
 * scroll-reset and canonicalizes the default.
 */
export const SkillDetailTabs = (
  props: SkillDetailTabsProps,
): React.ReactElement => {
  const {
    content,
    editable,
    entry,
    onAddTag,
    onRemoveOrphan,
    onRemoveTag,
    onRun,
    onSave,
    rawContent,
    runOptions,
    saveError,
    saving = false,
    tagPending = false,
    tagVocabulary,
    usage,
  } = props;

  // Hooks
  // `rawContent` seeds the editor with the full file (frontmatter included) so
  // a save round-trips it; read mode renders the stripped `content` below.
  // `editable` is only the checkout precondition — the hook ANDs it with
  // provenance into `canEdit`, so an external SKILL.md is never forked here.
  const {
    canEdit,
    draft,
    editDisabledTooltip,
    handleCancel,
    handleDraftChange,
    handleEdit,
    handleSave,
    invocationBadge,
    isDirty,
    isEditing,
  } = useSkillDetail({
    content: rawContent,
    editable,
    entry,
    onSave,
    saveError,
    saving,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-4">
      <SkillIntroduction
        canEdit={canEdit}
        editDisabledTooltip={editDisabledTooltip}
        entry={entry}
        invocationBadge={invocationBadge}
        isDirty={isDirty}
        isEditing={isEditing}
        onAddTag={onAddTag}
        onCancel={handleCancel}
        onEdit={handleEdit}
        onRemoveOrphan={onRemoveOrphan}
        onRemoveTag={onRemoveTag}
        onRun={onRun}
        onSave={handleSave}
        runOptions={runOptions}
        saveError={saveError}
        saving={saving}
        tagPending={tagPending}
        tagVocabulary={tagVocabulary}
      />

      <OpenThrottleTabs
        urlSync={{
          defaultValue: 'skill',
          param: SKILLS_DETAIL_TAB_SEARCH_PARAM,
          parse: (raw) => parseSkillDetailTab(raw) ?? undefined,
        }}
      >
        <TabsList
          className="mb-8 w-full max-w-full justify-start gap-4 overflow-x-auto overflow-y-hidden"
          variant="line"
        >
          <TabsTrigger
            className="flex-0 cursor-pointer"
            id="skill-tab-skill"
            value="skill"
          >
            <FileTextIcon />
            Skill
          </TabsTrigger>
          <TabsTrigger
            className="flex-0 cursor-pointer"
            id="skill-tab-usage"
            value="usage"
          >
            <GaugeIcon />
            Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skill">
          <SkillDetail
            content={content}
            draft={draft}
            entry={entry}
            isEditing={isEditing}
            onDraftChange={handleDraftChange}
          />
        </TabsContent>

        <TabsContent value="usage">
          <SkillUsageTabPanel usage={usage} />
        </TabsContent>
      </OpenThrottleTabs>
    </div>
  );
};
