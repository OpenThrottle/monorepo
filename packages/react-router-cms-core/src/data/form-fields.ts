import type * as React from 'react';

import { FormAnyOf } from '../components/FormAnyOf';
import { FormArray } from '../components/FormArray';
import { FormBoolean } from '../components/FormBoolean';
import { FormClassName } from '../components/FormClassName';
import { FormLink } from '../components/FormLink';
import { FormNumber } from '../components/FormNumber';
import { FormObject } from '../components/FormObject';
import { FormSelect } from '../components/FormSelect';
import { FormString } from '../components/FormString';
import { FormWysiwyg } from '../components/FormWysiwyg';
import type { CmsFormBaseProps } from '../types/cms-json-schema';
import type { CmsFormFieldKind } from '../utils/getFormFieldKind';

/**
 * @description The field `CoreFormRenderer` mounts for each kind of property. `children` is
 * rendered from the app's bindings instead, and `none` renders nothing. Kept out of the `data/`
 * barrel because it imports the field components, which import that barrel.
 */
export const FORM_FIELDS: Readonly<
  Record<
    Exclude<CmsFormFieldKind, 'children' | 'none'>,
    React.ComponentType<CmsFormBaseProps>
  >
> = {
  anyOf: FormAnyOf,
  array: FormArray,
  boolean: FormBoolean,
  className: FormClassName,
  link: FormLink,
  number: FormNumber,
  object: FormObject,
  select: FormSelect,
  string: FormString,
  wysiwyg: FormWysiwyg,
};
