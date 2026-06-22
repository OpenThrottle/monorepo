import { useNavigation } from 'react-router';
import { FormikConfig, FormikValues, useFormik } from 'formik';
import { FormEvent, useEffect, useState } from 'react';

/**
 * @description A simple hook for working with "Formik" and "Yup" in our
 * React Router applications.
 */
export const useForm = <T extends FormikValues = FormikValues>(
  config: FormikConfig<T>,
) => {
  // Hooks
  const formik = useFormik(config);
  const { state } = useNavigation();
  const [loading, setLoading] = useState(state === 'submitting');

  // Setup

  // Handlers
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    /**
     * @description If the form is already known-invalid we must suppress the
     * native submission. `preventDefault()` has to run synchronously here —
     * before any `await` — or the browser will have already navigated 👀.
     */
    if (!formik.isValid) {
      event.preventDefault();
      setLoading(true);

      /**
       * @description Hand off to Formik, which validates and surfaces the
       * errors (touches fields, renders messages). This is the single
       * validation pass — we no longer call `validateForm()` separately.
       */
      formik.handleSubmit(event);
      setLoading(false);
      return;
    }

    /**
     * @description Otherwise the form is valid: let the event continue to the
     * "server" (action), which is simply letting the browser's native form
     * submission proceed.
     */
    setLoading(true);
  };

  // Life Cycle

  // 🔌 Short Circuits
  useEffect(() => {
    setLoading(state === 'submitting');
  }, [state]);

  return {
    formik,
    loading,
    onSubmit,
    setLoading,
  };
};
