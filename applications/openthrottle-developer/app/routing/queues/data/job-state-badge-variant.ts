/**
 * @description Badge color per BullMQ job state for the queue job detail
 * header. Hoisted out of QueueJobDetail per component-primitive-shape R4.
 */

export const JOB_STATE_BADGE_VARIANT: Record<
  string,
  'green' | 'red' | 'yellow'
> = {
  active: 'yellow',
  completed: 'green',
  delayed: 'yellow',
  failed: 'red',
  waiting: 'yellow',
};
