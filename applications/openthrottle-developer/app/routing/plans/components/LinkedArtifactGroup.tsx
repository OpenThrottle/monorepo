import * as React from 'react';
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { LINKED_ARTIFACTS_PANEL_COPY } from '~/routing/plans/data/data.copy';
import { LINKED_ARTIFACT_COLLAPSED_PREVIEW_COUNT } from '~/routing/plans/data/linked-artifacts-panel-groups';
import type { LinkedArtifactRow } from '~/routing/plans/components/LinkedArtifactsPanel';

export interface LinkedArtifactGroupProps {
  /** Render closed on first paint (high-volume event types, e.g. status_change). */
  collapsedByDefault: boolean;
  count: number;
  label: string;
  /** Row renderer, supplied by the panel so the group stays layout-only. */
  renderRow: (artifact: LinkedArtifactRow) => React.ReactNode;
  rows: LinkedArtifactRow[];
}

export const LinkedArtifactGroup = (
  props: LinkedArtifactGroupProps,
): React.ReactElement => {
  const { collapsedByDefault, count, label, renderRow, rows } = props;

  // Hooks
  const [isOpen, setIsOpen] = React.useState(!collapsedByDefault);

  // Setup
  const Chevron = isOpen ? ChevronDownIcon : ChevronRightIcon;
  // While closed, a couple of rows stay visible so the group still says
  // something — a bare header would hide the most recent transition entirely.
  const preview = collapsedByDefault
    ? rows.slice(0, LINKED_ARTIFACT_COLLAPSED_PREVIEW_COUNT)
    : rows;
  const hidden = rows.length - preview.length;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (rows.length === 0) {
    return <></>;
  }

  return (
    <Collapsible
      data-testid="LinkedArtifactGroup"
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-left text-xs font-medium">
        <Chevron className="size-3.5 shrink-0" />
        <span>{label}</span>
        <Badge
          className="px-1.5 py-0 text-[10px]"
          size="xs"
          variant="secondary"
        >
          {count}
        </Badge>
      </CollapsibleTrigger>

      {isOpen ? null : (
        <ul className="flex flex-col gap-2 pl-5">
          {preview.map((artifact) => (
            <li key={artifact.id}>{renderRow(artifact)}</li>
          ))}
          {hidden > 0 ? (
            <li className="text-muted-foreground text-xs">
              +{hidden} {LINKED_ARTIFACTS_PANEL_COPY.collapsedMoreSuffix}
            </li>
          ) : null}
        </ul>
      )}

      <CollapsibleContent>
        <ul className="flex flex-col gap-2 pl-5">
          {rows.map((artifact) => (
            <li key={artifact.id}>{renderRow(artifact)}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};
