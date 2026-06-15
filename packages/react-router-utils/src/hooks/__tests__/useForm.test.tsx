import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  formik: {
    handleSubmit: vi.fn(),
    isValid: true,
    validateForm: vi.fn(),
  },
  useNavigation: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigation: mocks.useNavigation,
}));

vi.mock('formik', () => ({
  useFormik: vi.fn(() => mocks.formik),
}));

import { useForm } from '../useForm';

const createSubmitEvent = (): {
  event: FormEvent<HTMLFormElement>;
  preventDefault: ReturnType<typeof vi.fn>;
} => {
  const preventDefault = vi.fn();

  const event = { preventDefault } as unknown as FormEvent<HTMLFormElement>;

  return { event, preventDefault };
};

const renderUseForm = () =>
  renderHook(() => useForm({ initialValues: {}, onSubmit: vi.fn() }));

describe('useForm', () => {
  beforeEach(() => {
    mocks.useNavigation.mockReturnValue({ state: 'idle' });
    mocks.formik.handleSubmit.mockReset();
    mocks.formik.isValid = true;
    mocks.formik.validateForm.mockReset();
    mocks.formik.validateForm.mockResolvedValue({});
  });

  test('initialises loading to true when navigation is already submitting', () => {
    mocks.useNavigation.mockReturnValue({ state: 'submitting' });

    const { result } = renderUseForm();

    expect(result.current.loading).toBe(true);
  });

  test('tracks the navigation state through loading', () => {
    const { rerender, result } = renderUseForm();
    expect(result.current.loading).toBe(false);

    mocks.useNavigation.mockReturnValue({ state: 'submitting' });
    rerender();
    expect(result.current.loading).toBe(true);

    mocks.useNavigation.mockReturnValue({ state: 'idle' });
    rerender();
    expect(result.current.loading).toBe(false);
  });

  test('prevents default submission when the form is invalid', async () => {
    mocks.formik.isValid = false;

    const { result } = renderUseForm();
    const { event, preventDefault } = createSubmitEvent();

    await act(async () => {
      await result.current.onSubmit(event);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mocks.formik.handleSubmit).not.toHaveBeenCalled();
  });

  test('delegates to formik.handleSubmit and clears loading on validation errors', async () => {
    mocks.formik.isValid = false;
    mocks.formik.validateForm.mockResolvedValue({ name: 'Required' });

    const { result } = renderUseForm();
    const { event } = createSubmitEvent();

    await act(async () => {
      await result.current.onSubmit(event);
    });

    expect(mocks.formik.handleSubmit).toHaveBeenCalledWith(event);
    expect(result.current.loading).toBe(false);
  });

  test('lets a valid submission continue and keeps loading true', async () => {
    const { result } = renderUseForm();
    const { event, preventDefault } = createSubmitEvent();

    await act(async () => {
      await result.current.onSubmit(event);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mocks.formik.handleSubmit).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });
});
