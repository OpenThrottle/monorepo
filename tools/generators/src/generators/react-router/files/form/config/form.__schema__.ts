import { FormikConfig } from 'formik';
import type { ObjectSchema } from 'yup';
import { InferType, object, string } from 'yup';

/**
 * @link https://github.com/OpenThrottle/monorepo/blob/main/docs/Forms.md
 * @description Reference the doc above for details on how to use forms.
 */

type XxxxXxxx = {
  search: string;
};

export type FormSchema = InferType<typeof formSchema>;

/* eslint-disable sort-keys-fix/sort-keys-fix */
export const formSchema: ObjectSchema<XxxxXxxx> = object({
  // TODO: Implement your schema fields
  search: string()
    .default('')
    .label('Search')
    .meta({ placeholder: 'Search for something' })
    .required('Search is required.'),
});
/* eslint-enable sort-keys-fix/sort-keys-fix */

export const formDefaults: FormSchema = formSchema.getDefault();

export const formSetup = (
  initialValues: FormSchema = formDefaults,
): FormikConfig<FormSchema> => ({
  initialValues,
  onSubmit: () => undefined, // Remix handles our actual submission
  validateOnBlur: false,
  validateOnChange: true,
  validateOnMount: true,
  validationSchema: formSchema,
});
