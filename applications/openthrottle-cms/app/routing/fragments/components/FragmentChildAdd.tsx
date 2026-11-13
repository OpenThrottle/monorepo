import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Form } from 'react-router';

import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';
import type { FragmentChildCandidate } from '~/routing/fragments/types/fragment-children';

export interface FragmentChildAddProps {
  readonly candidates: readonly FragmentChildCandidate[];
  readonly className: string | undefined;
  /** The form's element id, so cms-core's "Add children" link can point at it. */
  readonly id: string;
}

/**
 * @description Adds an existing fragment as the last child of the fragment being edited, by
 * posting the route's `addChild` intent. Rendered outside the property form, which cannot nest it.
 */
export const FragmentChildAdd = (
  props: FragmentChildAddProps,
): React.ReactElement => {
  const { candidates, className, id } = props;

  // Hooks

  // Setup
  const isEmpty = candidates.length === 0;
  const labelId = `${id}-label`;

  // Handlers

  // Markup
  const items = candidates.map((candidate) => {
    return (
      <SelectItem key={candidate.uuid} value={candidate.uuid}>
        {candidate.name || candidate.typename}
        <span className="text-muted-foreground ml-2 text-xs">
          {candidate.typename}
        </span>
      </SelectItem>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form
      className={cn('flex flex-col gap-2 border-t p-4', className)}
      data-testid="FragmentChildAdd"
      id={id}
      method="post"
    >
      <input name="intent" type="hidden" value={FRAGMENT_INTENT.ADD_CHILD} />
      <p className="text-sm font-bold" id={labelId}>
        {FRAGMENT_EDITOR_COPY.addChildHeading}
      </p>
      <div className="flex gap-2">
        <Select disabled={isEmpty} name="childUuid" required={true}>
          <SelectTrigger aria-labelledby={labelId} className="flex-1">
            <SelectValue
              placeholder={FRAGMENT_EDITOR_COPY.addChildPlaceholder}
            />
          </SelectTrigger>
          <SelectContent>{items}</SelectContent>
        </Select>
        <Button disabled={isEmpty} type="submit" variant="outline">
          {FRAGMENT_EDITOR_COPY.addChild}
        </Button>
      </div>
    </Form>
  );
};
