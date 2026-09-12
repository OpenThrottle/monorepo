import * as React from 'react';
import clsx from 'clsx';
import { FocusError } from 'focus-formik-error';
import { Form } from 'react-router';
import type { FormProps } from 'react-router';
import {
  Button,
  InlineErrors,
  Input,
  Label,
  Markdown
} from '@openthrottle/react-router-shadcn';
import { useForm } from '@openthrottle/react-router-utils';
import { formSetup } from '~/<%= directory %>/config/form.<%= schema %>';
import type { FormSchema } from '~/<%= directory %>/config/form.<%= schema %>';

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
  const { errors, handleChange, handleBlur, submitCount, touched, values } = formik;

  // Formik marks every field touched on submit, so this gates the error summary
  // on "the user has tried to submit at least once" rather than on `dirty` —
  // submitting a pristine, invalid form must still surface why it was rejected.
  const hasSubmitted = submitCount > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form
      className={clsx(className, 'flex flex-col gap-4')}
      data-testid="<%= name %>"
      id={<%= name %>.id}
      method="POST"
      onSubmit={onSubmit}
      role="form"
    >
      <FocusError formik={formik} />
      <InlineErrors errors={hasSubmitted ? Object.values(errors) : []} />

      {/* ... Implement your form fields here ... */}
      {/*
        `Input` has no `error` or `label` prop by design — a field is composed
        from `Label` + `Input`, and the invalid styling is driven by the
        `aria-invalid` attribute rather than a variant prop.
      */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="search">Search</Label>
        <Input
          aria-invalid={!!touched.search && !!errors.search}
          id="search"
          onBlur={handleBlur}
          onChange={handleChange}
          type="text"
          value={values.search}
        />
      </div>

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

<%= name %>.id = '<%= nameKebab %>';
