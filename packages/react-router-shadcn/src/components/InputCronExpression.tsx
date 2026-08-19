import * as React from 'react';
import clsx from 'clsx';
import cronstrue from 'cronstrue';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { CRON_EXPRESSION_COPY, CRON_PRESETS } from '../data/data.cron-presets';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu';
import { InputGroup } from './InputGroup';
import { InputGroupAddon } from './InputGroupAddon';
import { InputGroupButton } from './InputGroupButton';
import { InputGroupInput } from './InputGroupInput';
import { InputGroupText } from './InputGroupText';

/**
 * @public
 * @description Props for {@link InputCronExpression}. Extends the native input
 * props so the control drops straight into a form in place of `<Input />` — `id`,
 * `name`, `defaultValue`, `value`, `required`, and `onChange` all pass through.
 */
export interface InputCronExpressionProps extends React.ComponentProps<'input'> {
  /** Class applied to the outer InputGroup, not the inner input. */
  readonly groupClassName?: string;
}

/** Describe a cron expression in English, or null when it does not parse. */
const describeCron = (expression: string): string | null => {
  try {
    return cronstrue.toString(expression, { use24HourTimeFormat: true });
  } catch {
    return null;
  }
};

/**
 * @public
 * @description A cron expression field: the raw expression stays editable, a
 * preset menu fills in common schedules, and cronstrue renders a live English
 * description underneath so the value is readable without decoding it by hand.
 * Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 */
export const InputCronExpression = React.forwardRef<
  HTMLInputElement,
  InputCronExpressionProps
>((props, ref): React.ReactElement => {
  const {
    'aria-describedby': ariaDescribedBy,
    className,
    defaultValue,
    groupClassName,
    id,
    onChange,
    value,
    ...rest
  } = props;

  // Hooks
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const generatedId = React.useId();
  const [innerValue, setInnerValue] = React.useState(
    String(value ?? defaultValue ?? ''),
  );

  // Setup
  const inputId = id ?? `${generatedId}-cron`;
  const descriptionId = `${inputId}-description`;

  // The rendered value trails the DOM input for uncontrolled usage, so read the
  // controlled prop first and fall back to what the last change reported.
  const currentValue = value === undefined ? innerValue : String(value);
  const trimmedValue = currentValue.trim();
  const description =
    trimmedValue.length === 0 ? null : describeCron(trimmedValue);

  // Handlers

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setInnerValue(event.target.value);
    onChange?.(event);
  };

  /**
   * Write a preset through the native value setter so React sees a real input
   * event — that keeps the consumer's onChange firing whether the field is
   * controlled or not, instead of silently mutating the DOM.
   */
  const handlePresetSelect = (preset: string): void => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    );

    descriptor?.set?.call(input, preset);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  };

  const handleRef = (node: HTMLInputElement | null): void => {
    inputRef.current = node;

    if (typeof ref === 'function') {
      ref(node);
      return;
    }

    if (ref) {
      ref.current = node;
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <InputGroup
      className={cn('h-auto', groupClassName)}
      data-testid="InputCronExpression"
    >
      {/*
      <InputGroupAddon align="inline-start">
        <InputGroupText>
          <ClockIcon />
        </InputGroupText>
      </InputGroupAddon>
      */}

      <InputGroupInput
        aria-describedby={cn(ariaDescribedBy, descriptionId)}
        className={clsx(className, 'text-center')}
        defaultValue={value === undefined ? defaultValue : undefined}
        id={inputId}
        onChange={handleChange}
        ref={handleRef}
        spellCheck={false}
        value={value}
        {...rest}
      />

      <InputGroupAddon align="inline-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild={true}>
            <InputGroupButton aria-label={CRON_EXPRESSION_COPY.presetsTrigger}>
              {CRON_EXPRESSION_COPY.presetsLabel}
              <ChevronDownIcon />
            </InputGroupButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {CRON_EXPRESSION_COPY.presetsLabel}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CRON_PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.value}
                onSelect={() => handlePresetSelect(preset.value)}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </InputGroupAddon>

      <InputGroupAddon align="inline-end">
        <InputGroupText id={descriptionId}>
          {trimmedValue.length === 0
            ? CRON_EXPRESSION_COPY.emptyHint
            : (description ?? CRON_EXPRESSION_COPY.invalid)}
        </InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
});

InputCronExpression.displayName = 'InputCronExpression';
