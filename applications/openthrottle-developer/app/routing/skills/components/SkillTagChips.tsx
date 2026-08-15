import * as React from 'react';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { SKILL_RECORD_TAGS_COPY } from '~/routing/skills/data/data.copy';

export interface SkillTagVocabularyOption {
  readonly dimension: string;
  readonly tag: string;
}

export interface SkillTagChipsProps {
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  pending?: boolean;
  tags: readonly string[];
  vocabulary: readonly SkillTagVocabularyOption[];
}

export const SkillTagChips = (
  props: SkillTagChipsProps,
): React.ReactElement => {
  const { onAddTag, onRemoveTag, pending = false, tags, vocabulary } = props;

  // Hooks
  const [selectedTag, setSelectedTag] = React.useState('');

  // Setup
  const applied = new Set(tags);
  const availableDomain = vocabulary.filter(
    (option) => option.dimension === 'domain' && !applied.has(option.tag),
  );
  const sorted = [...tags].sort((left, right) => left.localeCompare(right));

  // Handlers
  const handleAdd = (): void => {
    if (selectedTag === '') return;
    onAddTag(selectedTag);
    setSelectedTag('');
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="SkillTagChips"
    >
      {sorted.length === 0 ? (
        <span className="text-muted-foreground text-xs">
          {SKILL_RECORD_TAGS_COPY.emptyTags}
        </span>
      ) : null}
      {sorted.map((tag) => (
        <Badge className="gap-1" key={tag}>
          <span>{tag}</span>
          <button
            aria-label={`Remove tag ${tag}`}
            className="hover:text-destructive ml-0.5 cursor-pointer"
            disabled={pending}
            onClick={() => onRemoveTag(tag)}
            type="button"
          >
            ×
          </button>
        </Badge>
      ))}
      <div className="flex items-center gap-1">
        <select
          aria-label={SKILL_RECORD_TAGS_COPY.addTagLabel}
          className="border-input bg-background h-7 rounded-md border px-2 text-xs"
          onChange={(event) => setSelectedTag(event.target.value)}
          value={selectedTag}
        >
          <option value="">{SKILL_RECORD_TAGS_COPY.addTagLabel}…</option>
          {availableDomain.map((option) => (
            <option key={option.tag} value={option.tag}>
              {option.tag}
            </option>
          ))}
        </select>
        <Button
          disabled={pending || selectedTag === ''}
          onClick={handleAdd}
          size="sm"
          type="button"
          variant="outline"
        >
          {SKILL_RECORD_TAGS_COPY.addLabel}
        </Button>
      </div>
    </div>
  );
};
