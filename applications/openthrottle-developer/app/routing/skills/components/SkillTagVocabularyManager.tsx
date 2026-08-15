import * as React from 'react';
import clsx from 'clsx';
import { useFetcher } from 'react-router';
import {
  Button,
  Card,
  Input,
  Label,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { getActionError } from '@openthrottle/react-router-utils';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import { SkillTagVocabularyRow } from '~/routing/skills/components/SkillTagVocabularyRow';
import {
  isKebabCase,
  type SkillTagValue,
} from '~/routing/skills/utils/skill-availability';

const COPY = SKILL_AVAILABILITY_COPY.vocabulary;

export interface SkillTagVocabularyManagerProps {
  readonly className?: string;
  /** The workspace vocabulary (16 platform defaults seed on first read). */
  readonly tags: readonly SkillTagValue[];
}

/**
 * @description The workspace tag-vocabulary manager: add (`addTag`), rename (`renameTag`), and
 * remove (`removeTag`) tags, each with kebab-case client validation. A persistent caveat states
 * honestly that rename/remove change the vocabulary only — they do NOT rewrite skill frontmatter or
 * the rules that already reference a tag.
 */
export const SkillTagVocabularyManager = (
  props: SkillTagVocabularyManagerProps,
): React.ReactElement => {
  const { className, tags } = props;

  // Hooks
  const addFetcher = useFetcher();
  const [newTag, setNewTag] = React.useState('');
  const [clientError, setClientError] = React.useState<string | undefined>(
    undefined,
  );

  // Setup
  const serverError = getActionError(addFetcher.data);

  // Handlers
  const handleAddSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    if (!isKebabCase(newTag.trim())) {
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
    <Card
      className={clsx('flex flex-col gap-4 p-6', className)}
      data-testid="SkillTagVocabularyManager"
    >
      <h2 className="text-lg font-semibold">{COPY.heading}</h2>
      <p className="text-muted-foreground text-sm">{COPY.caveat}</p>

      <addFetcher.Form
        className="flex flex-col gap-2"
        method="post"
        onSubmit={handleAddSubmit}
      >
        <input name="intent" type="hidden" value="addTag" />
        <Label htmlFor="skill-tag-new">{COPY.addLabel}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="skill-tag-new"
            name="tag"
            onChange={(event) => setNewTag(event.target.value)}
            placeholder={COPY.addPlaceholder}
            value={newTag}
          />
          <Button type="submit">{COPY.addLabel}</Button>
        </div>
        {clientError ? (
          <p className="text-destructive text-sm" role="alert">
            {clientError}
          </p>
        ) : null}
        {serverError ? (
          <p className="text-destructive text-sm" role="alert">
            {serverError}
          </p>
        ) : null}
      </addFetcher.Form>

      {tags.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.emptyNote}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{COPY.tagColumn}</TableHead>
              <TableHead className="text-right">{COPY.removeLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <SkillTagVocabularyRow key={tag.id} tag={tag} />
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};
