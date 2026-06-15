import { Duration, formatDuration, intervalToDuration } from 'date-fns';

export const formatMillisecondsAsHumanReadable = (
  milliseconds: number,
  format: (keyof Duration)[] = [
    'years',
    'months',
    'weeks',
    'days',
    'hours',
    'minutes',
    'seconds',
  ],
) => {
  return formatDuration(
    intervalToDuration({
      start: 0,
      end: milliseconds,
    }),
    {
      format,
    },
  );
};

export function sleepAsync(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
