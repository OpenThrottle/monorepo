import { useNavigation } from 'react-router';
import { FormikConfig, FormikValues, useFormik } from 'formik';
import { FormEvent, useEffect, useState } from 'react';

/**
 * @description A simple hook for working with "Formik" and "Yup" in our
 * Remix applications.
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
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // If its invalid we don't want to submit the form ~ has to be first 👀!
    if (!formik.isValid) event.preventDefault();

    setLoading(true);

    const errors = await formik.validateForm();
    const isValid = Object.entries(errors).length === 0;

    /**
     * @description If the form is "invalid" we let "Formik" handle the errors
     */
    if (!isValid) {
      formik.handleSubmit(event);
      setLoading(false);
    }

    /**
     * @description Otherwise let the event continue to the "server" (action)
     * Which is simply letting the web and browsers form do what they do.
     */
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
