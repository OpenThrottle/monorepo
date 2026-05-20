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
import {
  fnv1a32Hex,
  formatIso,
  formatRelativeFromIso,
} from '~/routing/prompts/utils/utils.prompts';
import { githubOpenThrottleMainBlob } from '~/routing/agents/constants/github-repo-paths';
import type { GetPromptQuery } from '~/__generated__/graphql';

export interface PromptDetailMetadataPanelProps {
  contentLength: number;
  /** Current editor buffer (use for fingerprint; may differ from API until save). */
  debugContent: string;
  prompt: NonNullable<GetPromptQuery['customPrompt']>;
}

/**
 * JSON snapshot for support / diff tools; keys are alphabetized for stable
 * copy-paste.
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
 * Debug-oriented versioning metadata (timestamps, ids, repo path) for
 * custom prompts.
 */
export const PromptDetailMetadataPanel = (
  props: PromptDetailMetadataPanelProps,
) => {
  const { contentLength, debugContent, prompt } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);

  // Setup
  const Chevron = open ? ChevronDown : ChevronRight;

  // Handlers
  const handleCopy = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  const handleCopySnapshot = (): void => {
    void handleCopy(buildPromptDebugSnapshotJson(prompt, debugContent));
  };

  const labelsJoined =
    prompt.labels.length > 0 ? prompt.labels.join(', ') : '(none)';

  const rows: { label: string; value: string }[] = [
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

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
    // className="border-dashed bg-muted/30"
    >
      <CardHeader className="py-3 pb-2">
        <button
          className="flex w-full items-center gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <Chevron className="h-4 w-4 shrink-0" />
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
              onClick={handleCopySnapshot}
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
};
