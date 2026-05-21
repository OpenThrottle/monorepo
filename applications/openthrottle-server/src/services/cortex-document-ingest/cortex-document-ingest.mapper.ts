import type {
  CortexDocumentParseTree,
  CortexParseBlock,
} from '../cortex-document-parse/cortex-document-parse.types';

interface IngestDraftTask {
  readonly description: string | null;
  readonly requirements: readonly string[];
  readonly title: string;
}

interface IngestDraft {
  readonly planTitle: string;
  readonly proposedTasks: readonly IngestDraftTask[];
}

type HeadingBlock = Extract<CortexParseBlock, { readonly kind: 'heading' }>;

/**
 * @description Deterministic first-pass mapping from parse tree blocks to a plan title and proposed tasks (H2 sections and list items as requirements).
 */
export const mapParseTreeToIngestDraft = (
  tree: CortexDocumentParseTree,
): IngestDraft => {
  const blocks = tree.blocks;
  const firstHeadingIdx = blocks.findIndex((b) => b.kind === 'heading');
  const firstHeading: HeadingBlock | null =
    firstHeadingIdx >= 0 && blocks[firstHeadingIdx]?.kind === 'heading'
      ? (blocks[firstHeadingIdx] as HeadingBlock)
      : null;

  const planTitle =
    firstHeading != null && firstHeading.text.trim() !== ''
      ? firstHeading.text.trim()
      : 'Imported document';

  const proposedTasks: IngestDraftTask[] = [];
  let currentTitle: string | null = null;
  const bodyLines: string[] = [];
  const reqBuffer: string[] = [];

  const flushTask = (): void => {
    if (currentTitle == null) {
      return;
    }
    proposedTasks.push({
      description: bodyLines.join('\n').trim() || null,
      requirements: [...reqBuffer],
      title: currentTitle,
    });
    bodyLines.length = 0;
    reqBuffer.length = 0;
  };

  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b == null) {
      continue;
    }
    if (b.kind === 'heading') {
      if (i === firstHeadingIdx) {
        continue;
      }
      if (b.level === 2) {
        flushTask();
        currentTitle = b.text.trim() || 'Untitled task';
      } else {
        bodyLines.push(b.text);
      }
    } else if (b.kind === 'paragraph') {
      bodyLines.push(b.text);
    } else if (b.kind === 'list_item') {
      reqBuffer.push(b.text);
    } else if (b.kind === 'table') {
      bodyLines.push(
        [b.headers.join('\t'), ...b.rows.map((r) => r.join('\t'))].join('\n'),
      );
    }
  }
  flushTask();

  if (proposedTasks.length === 0) {
    const snippets: string[] = [];
    for (let i = 0; i < blocks.length; i += 1) {
      const b = blocks[i];
      if (b == null) {
        continue;
      }
      if (i === firstHeadingIdx) {
        continue;
      }
      if (b.kind === 'paragraph') {
        snippets.push(b.text);
      }
      if (b.kind === 'list_item') {
        snippets.push(b.text);
      }
      if (b.kind === 'table') {
        snippets.push(
          [b.headers.join('\t'), ...b.rows.map((r) => r.join('\t'))].join('\n'),
        );
      }
    }
    const blob = snippets.join('\n\n').trim();
    proposedTasks.push({
      description: blob || null,
      requirements: [],
      title: 'Imported task',
    });
  }

  return { planTitle, proposedTasks };
};
