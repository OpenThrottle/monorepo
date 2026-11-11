import { Button, cn, Input } from '@openthrottle/react-router-shadcn';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import * as React from 'react';

import { FORM_FIELD_COPY } from '../data/data.copy';
import { useFormField } from '../hooks/useFormField';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import { toInputValue, toListValue } from '../utils/form-value';
import { FormLabel } from './FormLabel';

/**
 * @public
 */
export interface FormArrayProps extends CmsFormBaseProps {}

/**
 * @description A list property, edited one text item at a time. Upstream added placeholder image
 * URLs and never removed anything; here items start empty and remove works.
 * @public
 */
export const FormArray = (props: FormArrayProps): React.ReactElement => {
  const { className, disabled, hideLabel, name, schema } = props;

  // Hooks
  const { description, isRequired, setValue, value } = useFormField({
    name,
    schema,
  });

  // Setup
  const items = toListValue(value);

  // Handlers
  const onClickAdd = (): void => {
    setValue([...items, '']);
  };

  const onChangeItem = (index: number) => {
    return (event: React.ChangeEvent<HTMLInputElement>): void => {
      setValue(items.with(index, event.target.value));
    };
  };

  const onClickRemove = (index: number) => {
    return (): void => {
      setValue(items.toSpliced(index, 1));
    };
  };

  // Markup
  const empty = (
    <p className="text-muted-foreground text-sm">
      {FORM_FIELD_COPY.arrayEmpty}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-2 p-4', className)}>
      <FormLabel
        className={undefined}
        hideLabel={hideLabel}
        required={isRequired}
        text={name}
      />
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      {items.length === 0 && empty}
      {items.map((item, index) => {
        return (
          <div className="flex items-center gap-2" key={index}>
            <Input
              aria-label={`${name} ${index + 1}`}
              disabled={disabled}
              onChange={onChangeItem(index)}
              value={toInputValue(item)}
            />
            <Button
              aria-label={FORM_FIELD_COPY.arrayRemove}
              disabled={disabled}
              onClick={onClickRemove(index)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <TrashIcon />
            </Button>
          </div>
        );
      })}
      <Button
        className="self-start"
        disabled={disabled}
        onClick={onClickAdd}
        type="button"
        variant="outline"
      >
        <PlusIcon />
        {FORM_FIELD_COPY.arrayAdd}
      </Button>
    </div>
  );
};
