# 🔏 Forms

With a little work up-front we can create a really concise and strong pattern to how we handle forms in our React Router applications. EOD we all want something that's; easy to use, and powerful... Works on client, and server... Strong typing throughout, without a LOT of code... For all of these reasons, we've landed on the tools and abstractions laid out below.

- [React Router](https://reactrouter.com) (v8, framework mode) - Our server side calls via [loaders](https://reactrouter.com/start/framework/data-loading) and [actions](https://reactrouter.com/start/framework/actions)
- [Formik](https://formik.org) - Our form library for use with React
- [Yup](https://github.com/jquense/yup) - Schema parsing and validation. Plays well with Formik + GraphQL

## Overview

Forms will typically consist of **3 parts** in our React Router apps. Scaffold them rather than hand-rolling:

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --subGenerator=form --application=<app> --folder=<folder> --name=<PascalCaseName>
```

1. Form Configuration
   1. A `routes/xxx/config/form.xxxXxxx.ts` file
   2. It exports `formSchema` and `FormSchema`
   3. It also exports a `formSetup` helper and `formDefaults`
2. Form Component
   1. A `routing/xxxx/components/XxxxYyyyForm.tsx` file
   2. This component makes use of the [React Router `Form`](https://reactrouter.com/api/components/Form).
   3. It should also use `<FocusError />` component for better UX
3. Server Endpoint
   1. A corresponding React Router `loader` or `action` on a route.
   2. We use the `schema.cast` for any type coercion needed

## 1. Form Configuration

At a high level each instance of a "form" has the following:

- **formSchema:** a yup schema used for client and server side validation
- **formDefaults:** reasonable defaults used by `formSetup`
- **formSetup:** Helper function used to initialize a form with Formik

### formSchema

We export a `Yup schema` which we can use on the client and server side to validate the form data. Using yup on the server side we make use of `cast` to correctly cast type(s) of the generic FormData type.

```tsx
export type Schema = InferType<typeof schema>;
export const schema = object({
  locationUUID: string().default('').required('Location is required.'),
  endDate: date().nullable().default(null).required('End Date is required.'),
  startDate: date().default(null).required('Start Date is required.'),
  territory: string().default('').required('Territory is required.'),
});
```

### formSetup

Lastly, we have our formSetup function which we can use to initialize our form. This can be used to initialize a form with default values or with initial values passed in from the loader. **ex:** A `create` vs. `update` form.

```tsx
export const formSetup = (
  initialValues: FormSchema = formDefaults,
): FormikConfig<Schema> => ({
  initialValues,
  onSubmit: () => undefined,
  validateOnBlur: false,
  validateOnChange: true,
  validateOnMount: true,
  validationSchema: formSchema,
});
```

### formDefaults

We disable the `sort-keys-fix` rule because we want the default values to be in the same order as the fields in the UI, keeping the tab order consistent. We may also (as seen below) need to use `null` as a default value for a field which is a caveat to React form inputs where we don't want to switch between uncontrolled and controlled inputs. Using a `null` value vs. `undefined` prevents this issue.

> **Note:** We should not export this value, its only used internally.

```tsx
/* eslint-disable sort-keys-fix/sort-keys-fix */
const formDefaults: FormSchema = {
  locationUUID: '',
  endDate: null as unknown as Date,
  startDate: null as unknown as Date,
};
/* eslint-enable sort-keys-fix/sort-keys-fix */
```

### Example

> [!TIP]
> If you're importing more than one, just rename as you import. This provides us a consistent naming convention for each form which in turn makes it easier to manage and more resilient to future updates.
>
> ```tsx
> import {
>   formSetup as setupXxxx,
>   formSchema as schemaXxxx,
> } from '~/routes/xxxx/config/form.xxxXxx';
> ```

```tsx
import { FormikConfig } from 'formik';
import { date, InferType, object, string } from 'yup';

export type FormSchema = InferType<typeof formSchema>;
export const formSchema: ObjectSchema<{
  locationUUID: string;
  endDate: Date;
  startDate: Date;
}> = object({
  locationUUID: string().default('').required('Company is required.'),
  endDate: date().nullable().default(null).required('End Date is required.'),
  startDate: date().default(null).required('Start Date is required.'),
});

export const formDefaults: FormSchema = formSchema.getDefault();

export const formSetup = (
  initialValues: FormSchema = formDefaults,
): FormikConfig<FormSchema> => ({
  initialValues,
  onSubmit: () => undefined,
  validateOnBlur: false,
  validateOnChange: true,
  validateOnMount: true,
  validationSchema: formSchema,
});
```

## 2. Form Component

```tsx
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { FocusError } from 'focus-formik-error';
import { Form } from 'react-router';
import { useForm } from '@openthrottle/react-router-utils';
import { formSetup } from '~/routing/xxx/config/form.xxx';

export interface XxxxXxxxFormProps {
  className?: string;
}

export const XxxxXxxxForm = (props: XxxxXxxxFormProps): React.ReactElement => {
  const { className } = props;

  // Hooks
  const form = formSetup();
  const { formik, onSubmit } = useForm(form);

  // Setup
  const { errors, touched, values } = formik;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuits

  return (
    <Form className={className} method="POST" onSubmit={onSubmit} role="form">
      {/* Puts our cursor on the first, invalid input, if we submit a bad form */}
      <FocusError formik={formik} />

      {/* ... Your form fields */}

      <Input
        errors={touched.locationUUID ? errors.locationUUID : undefined}
        id="locationUUID"
        onBlur={formik.handleBlur}
        label="locationUUID"
        onChange={formik.handleChange}
        placeholder="Company UUID"
        value={values.locationUUID}
      />

      <Button type="submit">Submit</Button>
    </Form>
  );
};
```

## 3. Server Endpoint (loader or action)

tbd...

### Loader

The loader is a `GET` request so there is no form data, only the URL. As such, any state we need will be taken from the URL.

```tsx
import { formSchema } from '~/routing/xxx/config/form.xxx';

export const loader = async (args: LoaderArgs) => {
  const { request } = args;

  const { searchParams } = new URL(request.url);
  const values = Object.fromEntries(searchParams);
  const validated = formSchema.cast(values);

  // ... Now we have our values, or we've thrown an error

  return typedjson({});
};
```

### Action

The action is any non `~GET~` request flow where we are dealing with the `FormData` directly.

```tsx
import { formSchema } from '~/routing/xxx/config/form.xxx';

export const action = async (args: ActionArgs) => {
  const { request } = args;

  const formData = await request.formData();
  const values = Object.fromEntries(formData);
  const validated = formSchema.cast(values);

  // ... Now we have our values, or we've thrown an error

  return typedjson({});
};
```
