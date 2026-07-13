import * as React from 'react';
import { Badge, Card } from '@openthrottle/react-router-shadcn';

export interface LinkedArtifactRow {
  externalKey: string;
  id: string;
  lifecycle?: string | null;
  // The GraphQL Date scalar arrives as epoch millis (number) or an ISO string.
  producedAt: number | string;
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

/** Coerce the Date scalar (number epoch millis | string) to a Date; matches the TaskDetails pattern. */
const toDate = (value: number | string): Date =>
  typeof value === 'number' ? new Date(value) : new Date(String(value));

const toMillis = (value: number | string): number => {
  const time = toDate(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatProducedAt = (value: number | string): string => {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

export const LinkedArtifactsPanel = (
  props: LinkedArtifactsPanelProps,
): React.ReactElement | null => {
  const { artifacts } = props;

  // Hooks

  // Setup — newest first (the query already orders by producedAt DESC; keep it stable here too).
  const ordered = [...artifacts].sort(
    (a, b) => toMillis(b.producedAt) - toMillis(a.producedAt),
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
