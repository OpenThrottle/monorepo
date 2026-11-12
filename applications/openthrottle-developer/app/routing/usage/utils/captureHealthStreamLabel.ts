import { CAPTURE_HEALTH_STREAM_LABELS } from '~/routing/usage/data/data.capture-health-copy';

/** Display label for a stream name, falling back to the raw name. */
export const captureHealthStreamLabel = (stream: string): string => {
  return CAPTURE_HEALTH_STREAM_LABELS[stream] ?? stream;
};
