import * as React from 'react';
import { useFetcher } from 'react-router';
import type { SkillCreateDestination } from '~/routing/skills/config/skill-create';
import {
  DEFAULT_SKILL_CREATE_DESTINATION,
  SKILL_CREATE_DESTINATIONS,
  SKILL_CREATE_FIELDS,
  SKILL_CREATE_SLUG_PATTERN,
} from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';
import { buildSkillScaffold } from '~/routing/skills/utils/build-skill-scaffold';

/** Stands in for the slug in the scaffold and the editor path until one is typed. */
const SLUG_PLACEHOLDER = 'my-new-skill';

const splitTags = (raw: string): readonly string[] =>
  raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

/** What the route action returns on a refusal. A success redirects instead. */
interface SkillCreateActionData {
  readonly error?: string;
}

export interface UseSkillCreateFormResult {
  canSubmit: boolean;
  content: string;
  description: string;
  destination: SkillCreateDestination;
  /** Path handed to Monaco; frozen once the author edits the document. */
  editorPath: string;
  /**
   * The server's refusal, if the last submission was refused.
   *
   * This comes from the FETCHER, not from the route's `actionData`. Submitting
   * through `useFetcher` never populates `actionData` — that is only set by a
   * navigation submission — so reading `actionData` here would swallow every
   * refusal silently: the author clicks Create, the server refuses, and nothing
   * appears on screen.
   */
  error: string | undefined;
  handleEditorChange: (value: string | undefined) => void;
  handleSubmit: () => void;
  /** True once the author has typed in the editor — the document then wins. */
  isDocumentDirty: boolean;
  isSubmitting: boolean;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  setDestination: React.Dispatch<React.SetStateAction<SkillCreateDestination>>;
  setSlug: React.Dispatch<React.SetStateAction<string>>;
  setTags: React.Dispatch<React.SetStateAction<string>>;
  slug: string;
  /** Client-side slug complaint, shown before a submit rather than after a refusal. */
  slugError: string | undefined;
  tags: string;
}

/**
 * @description Draft state, ⌘S submit, and the seeded-scaffold behavior for the
 * create-skill form. Extracted from the route Component per route-primitive-shape
 * R4 so the route file stays a thin adapter.
 *
 * The seeding rule is the part worth being careful about. While the document is
 * untouched, it is DERIVED from the metadata fields — typing a name or a
 * description rewrites the frontmatter live. The moment the author edits the
 * document themselves, `isDocumentDirty` flips and the document wins
 * permanently: the fields stop rewriting it, because silently clobbering
 * hand-written frontmatter on every keystroke is the obvious trap here.
 *
 * `editorPath` freezes at that same moment, and for the same underlying reason.
 * Monaco keys one text model per `path`, so a path derived from a slug the
 * author is still typing would rebuild the model — and discard the undo stack —
 * on every keystroke. Before the first edit that costs nothing (the document is
 * regenerated anyway); after it, it would be destructive.
 */
export const useSkillCreateForm = (): UseSkillCreateFormResult => {
  // Hooks
  const fetcher = useFetcher<SkillCreateActionData>();
  const [description, setDescription] = React.useState('');
  const [destination, setDestination] = React.useState<SkillCreateDestination>(
    DEFAULT_SKILL_CREATE_DESTINATION,
  );
  const [draft, setDraft] = React.useState('');
  const [isDocumentDirty, setIsDocumentDirty] = React.useState(false);
  const [slug, setSlug] = React.useState('');
  const [tags, setTags] = React.useState('');
  const frozenPathRef = React.useRef<string | undefined>(undefined);

  // Setup
  const trimmedSlug = slug.trim();
  const scaffoldName = trimmedSlug.length > 0 ? trimmedSlug : SLUG_PLACEHOLDER;

  const seededContent = React.useMemo(
    () =>
      buildSkillScaffold({
        description,
        name: scaffoldName,
        tags: splitTags(tags),
      }),
    [description, scaffoldName, tags],
  );

  const content = isDocumentDirty ? draft : seededContent;

  const livePath =
    destination === SKILL_CREATE_DESTINATIONS.repo
      ? `skills/${scaffoldName}/SKILL.md`
      : `${scaffoldName}/SKILL.md`;
  const editorPath = frozenPathRef.current ?? livePath;

  // A slug is only wrong once something has been typed — an untouched field
  // should not greet the author with an error.
  const slugError =
    trimmedSlug.length > 0 && !SKILL_CREATE_SLUG_PATTERN.test(trimmedSlug)
      ? SKILL_CREATE_COPY.invalidSlugError
      : undefined;

  const isSubmitting = fetcher.state === 'submitting';
  const error = fetcher.data?.error;
  const canSubmit =
    trimmedSlug.length > 0 &&
    slugError === undefined &&
    description.trim().length > 0 &&
    content.trim().length > 0;

  // Handlers
  const handleEditorChange = (value: string | undefined): void => {
    if (!isDocumentDirty) {
      frozenPathRef.current = livePath;
      setIsDocumentDirty(true);
    }
    setDraft(value ?? '');
  };

  const handleSubmit = React.useCallback((): void => {
    if (!canSubmit || isSubmitting) return;

    const formData = new FormData();
    formData.set(SKILL_CREATE_FIELDS.slug, trimmedSlug);
    formData.set(SKILL_CREATE_FIELDS.content, content);
    formData.set(SKILL_CREATE_FIELDS.destination, destination);

    fetcher.submit(formData, { method: 'post' });
  }, [canSubmit, content, destination, fetcher, isSubmitting, trimmedSlug]);

  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Life Cycle
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 🔌 Short Circuit

  return {
    canSubmit,
    content,
    description,
    destination,
    editorPath,
    error,
    handleEditorChange,
    handleSubmit,
    isDocumentDirty,
    isSubmitting,
    setDescription,
    setDestination,
    setSlug,
    setTags,
    slug,
    slugError,
    tags,
  };
};
