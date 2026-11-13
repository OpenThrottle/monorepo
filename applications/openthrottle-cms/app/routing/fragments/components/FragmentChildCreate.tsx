import {
  Button,
  cn,
  Input,
  Label,
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

export interface FragmentChildCreateProps {
  readonly className: string | undefined;
  /** Prefix for the form's element ids. */
  readonly id: string;
  /** Typenames with an ACTIVE schema. */
  readonly typenames: readonly string[];
}

/**
 * @description Creates a fragment of the chosen type, prefilled with its schema's defaults, and
 * attaches it as the last child of the fragment being edited — the route's `createChild` intent.
 */
export const FragmentChildCreate = (
  props: FragmentChildCreateProps,
): React.ReactElement => {
  const { className, id, typenames } = props;

  // Hooks

  // Setup
  const isEmpty = typenames.length === 0;
  const labelId = `${id}-label`;
  const nameId = `${id}-name`;

  // Handlers

  // Markup
  const items = typenames.map((typename) => {
    return (
      <SelectItem key={typename} value={typename}>
        {typename}
      </SelectItem>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form
      aria-labelledby={labelId}
      className={cn('flex flex-col gap-2 border-t p-4', className)}
      data-testid="FragmentChildCreate"
      method="post"
    >
      <input name="intent" type="hidden" value={FRAGMENT_INTENT.CREATE_CHILD} />
      <p className="text-sm font-bold" id={labelId}>
        {FRAGMENT_EDITOR_COPY.createChildHeading}
      </p>
      <div className="flex gap-2">
        <Select disabled={isEmpty} name="typename" required={true}>
          <SelectTrigger aria-labelledby={labelId} className="flex-1">
            <SelectValue
              placeholder={FRAGMENT_EDITOR_COPY.createChildTypenamePlaceholder}
            />
          </SelectTrigger>
          <SelectContent>{items}</SelectContent>
        </Select>
        <Label className="sr-only" htmlFor={nameId}>
          {FRAGMENT_EDITOR_COPY.createChildNameLabel}
        </Label>
        <Input
          className="flex-1"
          disabled={isEmpty}
          id={nameId}
          name="name"
          placeholder={FRAGMENT_EDITOR_COPY.createChildNameLabel}
        />
        <Button disabled={isEmpty} type="submit" variant="outline">
          {FRAGMENT_EDITOR_COPY.createChild}
        </Button>
      </div>
    </Form>
  );
};
