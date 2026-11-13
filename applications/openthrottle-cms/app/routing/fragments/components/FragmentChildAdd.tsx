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
import { Form, Link, useLocation, useNavigate } from 'react-router';

import { FRAGMENT_CHILD_ALL_TYPENAMES } from '~/routing/fragments/data/data.children';
import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';
import type { FragmentChildPicker } from '~/routing/fragments/types/fragment-children';
import { getChildPickerSearch } from '~/routing/fragments/utils/fragment-child-picker';

export interface FragmentChildAddProps {
  readonly className: string | undefined;
  /** The section's element id, so cms-core's "Add children" link can point at it. */
  readonly id: string;
  readonly picker: FragmentChildPicker;
}

/**
 * @description Adds an existing fragment as the last child of the fragment being edited, by
 * posting the route's `addChild` intent. Candidates come a page at a time, narrowed by typename;
 * both live in the URL, so a filtered page is a link. Rendered outside the property form, which
 * cannot nest it.
 */
export const FragmentChildAdd = (
  props: FragmentChildAddProps,
): React.ReactElement => {
  const { className, id, picker } = props;
  const { candidates, hasNextPage, page, typename, typenames } = picker;

  // Hooks
  const location = useLocation();
  const navigate = useNavigate();

  // Setup
  const isEmpty = candidates.length === 0;
  const labelId = `${id}-label`;
  const filterId = `${id}-filter`;
  const previousSearch = getChildPickerSearch(location.search, {
    page: page - 1,
    typename,
  });
  const nextSearch = getChildPickerSearch(location.search, {
    page: page + 1,
    typename,
  });

  // Handlers
  const onTypenameChange = (value: string): void => {
    const isAll = value === FRAGMENT_CHILD_ALL_TYPENAMES;
    const search = getChildPickerSearch(location.search, {
      page: 0,
      typename: isAll ? null : value,
    });

    void navigate({ hash: `#${id}`, search }, { preventScrollReset: true });
  };

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
  const typenameItems = typenames.map((value) => {
    return (
      <SelectItem key={value} value={value}>
        {value}
      </SelectItem>
    );
  });
  const previous = page > 0 && (
    <Button asChild={true} size="sm" variant="ghost">
      <Link preventScrollReset={true} to={previousSearch}>
        {FRAGMENT_EDITOR_COPY.previousPage}
      </Link>
    </Button>
  );
  const next = hasNextPage && (
    <Button asChild={true} size="sm" variant="ghost">
      <Link preventScrollReset={true} to={nextSearch}>
        {FRAGMENT_EDITOR_COPY.nextPage}
      </Link>
    </Button>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby={labelId}
      className={cn('flex flex-col gap-2 border-t p-4', className)}
      data-testid="FragmentChildAdd"
      id={id}
    >
      <p className="text-sm font-bold" id={labelId}>
        {FRAGMENT_EDITOR_COPY.addChildHeading}
      </p>
      <Select
        onValueChange={onTypenameChange}
        value={typename ?? FRAGMENT_CHILD_ALL_TYPENAMES}
      >
        <SelectTrigger
          aria-label={FRAGMENT_EDITOR_COPY.filterChildrenLabel}
          id={filterId}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FRAGMENT_CHILD_ALL_TYPENAMES}>
            {FRAGMENT_EDITOR_COPY.allTypenames}
          </SelectItem>
          {typenameItems}
        </SelectContent>
      </Select>
      <Form className="flex gap-2" method="post">
        <input name="intent" type="hidden" value={FRAGMENT_INTENT.ADD_CHILD} />
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
      </Form>
      <nav
        aria-label={FRAGMENT_EDITOR_COPY.pageLabel}
        className="flex items-center justify-between"
      >
        <span className="text-muted-foreground text-xs">
          {FRAGMENT_EDITOR_COPY.pageLabel} {page + 1}
        </span>
        <span className="flex gap-1">
          {previous}
          {next}
        </span>
      </nav>
    </section>
  );
};
