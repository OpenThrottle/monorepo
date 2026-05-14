import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { githubOpenThrottleMainBlob } from '~/routing/agents/constants/github-repo-paths';
import type { GetPromptQuery } from '~/__generated__/graphql';

export interface PromptDetailMetadataPanelProps {
  readonly contentLength: number;
  /** Current editor buffer (use for fingerprint; may differ from API until save). */
  readonly debugContent: string;
  readonly prompt: NonNullable<GetPromptQuery['customPrompt']>;
}

function formatIso(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

/**
 * @description Compact relative time for version-drift triage (same clock as the absolute timestamps).
 */
function formatRelativeFromIso(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const diffSec = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 48) {
    return rtf.format(diffHour, 'hour');
  }
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 365) {
    return rtf.format(diffDay, 'day');
  }
  const diffMonth = Math.round(diffDay / 30);
  return rtf.format(diffMonth, 'month');
}

/**
 * @description Deterministic 32-bit fingerprint for comparing editor buffer vs saved API content (debug only).
 */
function fnv1a32Hex(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * @description JSON snapshot for support / diff tools; keys are alphabetized for stable copy-paste.
 */
function buildPromptDebugSnapshotJson(
  prompt: NonNullable<GetPromptQuery['customPrompt']>,
  debugContent: string,
): string {
  const bufferFp = fnv1a32Hex(debugContent);
  const savedFp = fnv1a32Hex(prompt.content);
  return JSON.stringify(
    {
      contentFingerprint: bufferFp,
      createdAt: prompt.createdAt,
      filePath: prompt.filePath ?? null,
      hasUnsavedEditorBuffer: debugContent !== prompt.content,
      labels: prompt.labels,
      projectId: prompt.projectId ?? null,
      promptId: prompt.id,
      promptType: String(prompt.promptType),
      savedContentFingerprint: savedFp,
      title: prompt.title,
      updatedAt: prompt.updatedAt,
      userId: prompt.userId ?? null,
    },
    null,
    2,
  );
}

/**
 * @description Debug-oriented versioning metadata (timestamps, ids, repo path) for custom prompts.
 */
export function PromptDetailMetadataPanel(
  props: PromptDetailMetadataPanelProps,
): React.ReactElement {
  const { contentLength, debugContent, prompt } = props;
  const [open, setOpen] = React.useState(false);

  const handleCopy = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  const handleCopyDebugSnapshot = (): void => {
    void handleCopy(buildPromptDebugSnapshotJson(prompt, debugContent));
  };

  const labelsJoined =
    prompt.labels.length > 0 ? prompt.labels.join(', ') : '(none)';

  const rows: readonly { label: string; value: string }[] = [
    { label: 'Prompt ID', value: prompt.id },
    { label: 'promptType', value: String(prompt.promptType) },
    { label: 'Labels', value: labelsJoined },
    ...(prompt.description
      ? [{ label: 'Description', value: prompt.description }]
      : []),
    { label: 'Created', value: formatIso(prompt.createdAt) },
    {
      label: 'Created (relative)',
      value: formatRelativeFromIso(prompt.createdAt) || '—',
    },
    { label: 'Updated', value: formatIso(prompt.updatedAt) },
    {
      label: 'Updated (relative)',
      value: formatRelativeFromIso(prompt.updatedAt) || '—',
    },
    {
      label: 'Content length',
      value: `${contentLength.toLocaleString()} characters`,
    },
    {
      label: 'Content fingerprint (FNV-1a)',
      value: fnv1a32Hex(debugContent),
    },
    ...(debugContent !== prompt.content
      ? [
          {
            label: 'Saved fingerprint (API)',
            value: fnv1a32Hex(prompt.content),
          },
        ]
      : []),
    ...(prompt.filePath
      ? [{ label: 'filePath (repo)', value: prompt.filePath }]
      : []),
    ...(prompt.projectId
      ? [{ label: 'projectId', value: prompt.projectId }]
      : []),
    ...(prompt.userId ? [{ label: 'userId', value: prompt.userId }] : []),
  ];

  return (
    <Card className="mx-4 mb-4 border-dashed bg-muted/30">
      <CardHeader className="py-3 pb-2">
        <button
          className="flex w-full items-center gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <div>
            <CardTitle className="text-sm">
              Prompt versioning &amp; debug
            </CardTitle>
            <CardDescription className="text-xs">
              Compare with Git history for the same <code>filePath</code>; API
              stores <code>updatedAt</code> when content changes in the portal.
              Fingerprint helps spot unsaved drift vs the last loaded document.
            </CardDescription>
          </div>
        </button>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-3 pt-0">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {rows.map((row) => (
              <div className="min-w-0" key={row.label}>
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-mono text-xs break-all">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleCopy(prompt.id)}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy prompt ID
            </Button>
            <Button
              onClick={handleCopyDebugSnapshot}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy debug snapshot (JSON)
            </Button>
            {prompt.filePath ? (
              <Button
                onClick={() => handleCopy(prompt.filePath ?? '')}
                size="sm"
                type="button"
                variant="outline"
              >
                Copy filePath
              </Button>
            ) : null}
            {prompt.filePath ? (
              <Button
                asChild={true}
                size="sm"
                type="button"
                variant="secondary"
              >
                <a
                  href={githubOpenThrottleMainBlob(prompt.filePath)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  View file on GitHub
                </a>
              </Button>
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
