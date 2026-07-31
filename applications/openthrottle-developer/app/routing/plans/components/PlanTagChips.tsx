import * as React from 'react';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { formatPlanTagProvenance } from '~/routing/plans/utils/plan-tag-chips';

export interface PlanTagChipData {
  confidence?: number | null;
  dimension: string;
  source: string;
  tag: string;
}

export interface PlanTagVocabularyOption {
  dimension: string;
  tag: string;
}

export interface PlanTagChipsProps {
  // className?: string;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  pending?: boolean;
  tags: PlanTagChipData[];
  vocabulary: PlanTagVocabularyOption[];
}

export const PlanTagChips = (props: PlanTagChipsProps): React.ReactElement => {
  const { onAddTag, onRemoveTag, pending = false, tags, vocabulary } = props;

  // Hooks
  const [selectedTag, setSelectedTag] = React.useState('');

  // Setup
  const applied = new Set(tags.map((tag) => tag.tag));
  const available = vocabulary.filter((option) => !applied.has(option.tag));
  const availableDomain = available.filter(
    (option) => option.dimension === 'domain',
  );
  const availablePhase = available.filter(
    (option) => option.dimension === 'phase',
  );
  const sorted = [...tags].sort((a, b) =>
    a.dimension === b.dimension
      ? a.tag.localeCompare(b.tag)
      : a.dimension === 'phase'
        ? -1
        : 1,
  );

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
      data-testid="PlanTagChips"
    >
      {sorted.length === 0 ? (
        <span className="text-muted-foreground text-xs">No tags yet</span>
      ) : null}
      {sorted.map((tag) => (
        <Badge
          className={
            tag.dimension === 'phase'
              ? 'gap-1 border-amber-500/60 bg-amber-500/10'
              : 'gap-1'
          }
          key={tag.tag}
          title={formatPlanTagProvenance(tag)}
        >
          <span>{tag.tag}</span>
          {tag.dimension === 'phase' ? (
            <span className="text-muted-foreground text-[10px] uppercase">
              phase
            </span>
          ) : null}
          {/* The signed-in developer is a human caller: the provenance ladder
              lets humans remove any row, so removal is always offered here. */}
          <button
            aria-label={`Remove tag ${tag.tag}`}
            className="hover:text-destructive ml-0.5 cursor-pointer"
            disabled={pending}
            onClick={() => onRemoveTag(tag.tag)}
            type="button"
          >
            ×
          </button>
        </Badge>
      ))}
      <div className="flex items-center gap-1">
        <select
          aria-label="Add a tag"
          className="border-input bg-background h-7 rounded-md border px-2 text-xs"
          onChange={(event) => setSelectedTag(event.target.value)}
          value={selectedTag}
        >
          <option value="">Add tag…</option>
          <optgroup label="Phase">
            {availablePhase.map((option) => (
              <option key={option.tag} value={option.tag}>
                {option.tag}
              </option>
            ))}
          </optgroup>
          <optgroup label="Domain">
            {availableDomain.map((option) => (
              <option key={option.tag} value={option.tag}>
                {option.tag}
              </option>
            ))}
          </optgroup>
        </select>
        <Button
          disabled={pending || selectedTag === ''}
          onClick={handleAdd}
          size="sm"
          type="button"
          variant="outline"
        >
          Add
        </Button>
      </div>
    </div>
  );
};
