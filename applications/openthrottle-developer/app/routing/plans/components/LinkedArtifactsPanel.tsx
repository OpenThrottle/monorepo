import * as React from 'react';
import { Badge, Card } from '@openthrottle/react-router-shadcn';

export interface LinkedArtifactRow {
  externalKey: string;
  id: string;
  lifecycle?: string | null;
  producedAt: string;
  source: string;
  type: string;
  verification: string;
}

export interface LinkedArtifactsPanelProps {
  artifacts: LinkedArtifactRow[];
}

/** Verification badge styling — verified reads calm, orphaned warns, unverified is muted (a pending claim). */
const VERIFICATION_STYLES: Record<string, string> = {
  orphaned: 'border-amber-500/60 bg-amber-500/10',
  unverified: 'border-slate-500/60 bg-slate-500/10',
  verified: 'border-emerald-500/60 bg-emerald-500/10',
};

const formatProducedAt = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
};

export const LinkedArtifactsPanel = (
  props: LinkedArtifactsPanelProps,
): React.ReactElement | null => {
  const { artifacts } = props;

  // Hooks

  // Setup — newest first (the query already orders by producedAt DESC; keep it stable here too).
  const ordered = [...artifacts].sort((a, b) =>
    b.producedAt.localeCompare(a.producedAt),
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <Card className="p-4" data-testid="LinkedArtifactsPanel">
      <h3 className="mb-2 text-sm font-semibold">Linked artifacts</h3>
      <ul className="flex flex-col gap-2">
        {ordered.map((artifact) => (
          <li
            className="flex flex-wrap items-center gap-2 text-xs"
            key={artifact.id}
          >
            <Badge
              className={VERIFICATION_STYLES[artifact.verification] ?? ''}
              title={`Verification: ${artifact.verification}`}
            >
              {artifact.verification}
            </Badge>
            <span className="font-medium">{artifact.type}</span>
            <span className="text-muted-foreground">
              {artifact.externalKey}
            </span>
            {artifact.lifecycle != null ? (
              <span className="text-muted-foreground">
                · {artifact.lifecycle}
              </span>
            ) : null}
            <span className="text-muted-foreground">via {artifact.source}</span>
            <span className="text-muted-foreground">
              {formatProducedAt(artifact.producedAt)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
};
