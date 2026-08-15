import * as React from 'react';
import { useFetcher } from 'react-router';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  TableCell,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { getActionError } from '@openthrottle/react-router-utils';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import {
  isKebabCase,
  type SkillTagValue,
} from '~/routing/skills/utils/skill-availability';

const COPY = SKILL_AVAILABILITY_COPY.vocabulary;

export interface SkillTagVocabularyRowProps {
  /** The tag this row edits. */
  readonly tag: SkillTagValue;
}

/**
 * @description One workspace-vocabulary tag row: an inline rename (`renameTag`) with kebab-case
 * client validation and a confirm-gated remove (`removeTag`). Both operations touch the vocabulary
 * only — the confirm copy is honest that frontmatter and existing rules are NOT rewritten. Server
 * errors surface inline.
 */
export const SkillTagVocabularyRow = (
  props: SkillTagVocabularyRowProps,
): React.ReactElement => {
  const { tag } = props;

  // Hooks
  const renameFetcher = useFetcher();
  const removeFetcher = useFetcher();
  const [renameValue, setRenameValue] = React.useState(tag.tag);
  const [clientError, setClientError] = React.useState<string | undefined>(
    undefined,
  );

  // Setup
  const serverError = getActionError(renameFetcher.data);

  // Handlers
  const handleRenameSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ): void => {
    if (!isKebabCase(renameValue.trim())) {
      event.preventDefault();
      setClientError(COPY.invalidTagError);
      return;
    }
    setClientError(undefined);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TableRow data-testid={`SkillTagVocabularyRow-${tag.tag}`}>
      <TableCell>
        <renameFetcher.Form
          className="flex items-center gap-2"
          method="post"
          onSubmit={handleRenameSubmit}
        >
          <input name="intent" type="hidden" value="renameTag" />
          <input name="from" type="hidden" value={tag.tag} />
          <Input
            aria-label={`Rename ${tag.tag}`}
            name="to"
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder={COPY.renamePlaceholder}
            value={renameValue}
          />
          <Button type="submit" variant="outline">
            {COPY.renameLabel}
          </Button>
        </renameFetcher.Form>
        {clientError ? (
          <p className="text-destructive mt-1 text-sm" role="alert">
            {clientError}
          </p>
        ) : null}
        {serverError ? (
          <p className="text-destructive mt-1 text-sm" role="alert">
            {serverError}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild={true}>
            <Button
              aria-label={`Remove ${tag.tag}`}
              type="button"
              variant="outline"
            >
              {COPY.removeLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {COPY.removeLabel} &quot;{tag.tag}&quot;?
              </AlertDialogTitle>
              <AlertDialogDescription>{COPY.caveat}</AlertDialogDescription>
            </AlertDialogHeader>
            <removeFetcher.Form method="post">
              <input name="intent" type="hidden" value="removeTag" />
              <input name="tag" type="hidden" value={tag.tag} />
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <Button type="submit" variant="destructive">
                  {COPY.removeLabel}
                </Button>
              </AlertDialogFooter>
            </removeFetcher.Form>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
};
