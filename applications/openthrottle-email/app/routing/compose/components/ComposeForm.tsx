import {
  Button,
  Input,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import classnames from 'classnames';
import { FocusError } from 'focus-formik-error';
import { Form, type FormProps } from 'react-router';
import { useForm } from '@openthrottle/react-router-utils';
import {
  formSetup,
  type FormSchema,
} from '~/routing/compose/config/form.compose';

export interface ComposeFormProps extends FormProps {
  className?: string;
  debug?: boolean;
  initialValues?: FormSchema;
}

/**
 * @description New-message form (To, Subject, Body). Uses shadcn-ui Button, Input, Label, TextArea.
 * Reply/forward: prefill from query params (?replyTo=id, ?replyAll=1, ?forward=id) in compose route; wire initialValues from loader when backend is ready.
 */
export const ComposeForm = (props: ComposeFormProps) => {
  const { className, debug = false, initialValues } = props;

  // Hooks
  const form = formSetup(initialValues);
  const { formik, onSubmit } = useForm(form);

  // Setup
  const {
    dirty,
    errors,
    handleChange,
    handleBlur,
    submitCount,
    touched,
    values,
  } = formik;

  const isDirty = dirty && submitCount > 0;
  const errorList = isDirty ? Object.values(errors).filter(Boolean) : [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuits

  return (
    <Form
      className={classnames(className, 'flex flex-col gap-4')}
      data-testid="ComposeForm"
      id={ComposeForm.id}
      method="POST"
      onSubmit={onSubmit}
      role="form"
    >
      <FocusError formik={formik} />
      {errorList.length > 0 && (
        <ul
          className="list-inside list-disc text-destructive text-sm"
          role="alert"
        >
          {errorList.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-2">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          name="to"
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder="Recipient email"
          type="email"
          value={values.to}
        />
        {touched.to != null && errors.to != null && (
          <p className="text-destructive text-sm">{errors.to}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder="Subject"
          type="text"
          value={values.subject}
        />
        {touched.subject != null && errors.subject != null && (
          <p className="text-destructive text-sm">{errors.subject}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="body">Body</Label>
        <TextArea
          id="body"
          name="body"
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder="Message body"
          rows={8}
          value={values.body}
        />
        {touched.body != null && errors.body != null && (
          <p className="text-destructive text-sm">{errors.body}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button name="formName" type="submit" value={ComposeForm.id}>
          Send
        </Button>
      </div>

      {debug && (
        <pre className="overflow-auto rounded border p-2 text-xs">
          {JSON.stringify(values, null, 2)}
        </pre>
      )}
    </Form>
  );
};

ComposeForm.id = 'ComposeForm';
