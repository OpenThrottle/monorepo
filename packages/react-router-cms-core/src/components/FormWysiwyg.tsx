import { cn, TextArea } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useFormField } from '../hooks/useFormField';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import { toInputValue } from '../utils/form-value';
import { FormLabel } from './FormLabel';

/**
 * @public
 */
export interface FormWysiwygProps extends CmsFormBaseProps {}

/**
 * @description Rich-text (HTML) content, edited as source for now. Upstream embedded TinyMCE from
 * its CDN with an API key in the source; which editor replaces it is still open.
 * @public
 */
export const FormWysiwyg = (props: FormWysiwygProps): React.ReactElement => {
  const { className, disabled, label, parent, schema } = props;

  // Hooks
  const { description, isRequired, setValue, value } = useFormField({
    label,
    schema,
  });

  // Setup

  // Handlers
  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setValue(event.target.value);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-2 p-4', className)}>
      <FormLabel
        className={undefined}
        copy={label}
        parent={parent}
        required={isRequired}
      />
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <TextArea
        aria-label={label}
        className="min-h-40 font-mono"
        disabled={disabled}
        id={label}
        name={label}
        onChange={onChange}
        required={isRequired}
        value={toInputValue(value)}
      />
    </div>
  );
};
