import classnames from 'classnames';
import { FocusError } from 'focus-formik-error';
import { Form, FormProps } from 'react-router';
import { Button, Error, Input, Markdown } from '@openthrottle/react-router-shadcn';
import { useForm } from '@openthrottle/react-router-utils';
import {
  formSetup,
  FormSchema
} from '~/<%= directory %>/config/form.<%= schema %>';

export interface <%= name %>Props extends FormProps {
  className?: string;
  debug?: boolean;
  initialValues?: FormSchema;
}

export const <%= name %> = (props: <%= name %>Props): React.ReactElement => {
  const { className, debug = false, initialValues } = props;

  // Hooks
  const form = formSetup(initialValues);
  const { formik, onSubmit } = useForm(form);

  // Setup
  const { dirty, errors, handleChange, handleBlur, submitCount, touched, values } = formik;

  const isDirty = dirty && submitCount > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuits

  return (
    <Form
      className={classnames(className, 'flex flex-col gap-4')}
      data-testid="<%= name %>"
      id={<%= name %>.id}
      method="POST"
      onSubmit={onSubmit}
      role="form"
    >
      <FocusError formik={formik} />
      <Error errors={isDirty ? Object.values(errors) : []} />

      {/* ... Implement your form fields here ... */}
      <Input
        error={!!touched.search && !!errors.search}
        id="search"
        label="Search"
        onBlur={handleBlur}
        onChange={handleChange}
        type="text"
        value={values.search}
      />

      <div className="flex justify-end">
        <Button
          name="formName"
          type="submit"
          value={<%= name %>.id}
        >
          Submit
        </Button>
      </div>

      {debug && <Markdown content={JSON.stringify(values, null, 2)} />}
    </Form>
  );
};

<%= name %>.id = '<%= name %>';
