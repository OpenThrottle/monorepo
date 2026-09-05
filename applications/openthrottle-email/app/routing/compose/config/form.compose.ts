import type { FormikConfig } from 'formik';
import type { ObjectSchema, InferType } from 'yup';
import { object, string } from 'yup';

/**
 * @link https://github.com/visormatt/monorepo/blob/main/docs/Forms.md
 * @description Reference the doc above for details on how to use forms.
 */

type ComposeFormFields = {
  body: string;
  subject: string;
  to: string;
};

export type FormSchema = InferType<typeof formSchema>;

export const formSchema: ObjectSchema<ComposeFormFields> = object({
  body: string()
    .default('')
    .label('Body')
    .meta({ placeholder: 'Message body' }),
  subject: string()
    .default('')
    .label('Subject')
    .meta({ placeholder: 'Subject' })
    .required('Subject is required.'),
  to: string()
    .default('')
    .label('To')
    .meta({ placeholder: 'Recipient email' })
    .required('To is required.'),
});

const formDefaults: FormSchema = formSchema.getDefault();

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
