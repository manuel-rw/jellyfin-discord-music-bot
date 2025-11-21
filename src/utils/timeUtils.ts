import { formatDuration, intervalToDuration } from 'date-fns';
import { Duration } from 'date-fns/types';

export const formatMillisecondsAsHumanReadable = (
  milliseconds: number,
  format: (keyof Duration)[] = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'],
) => {
  return formatDuration(
    intervalToDuration({
      start: milliseconds,
      end: 0,
    }),
    {
      format,
    },
  );
};

export function sleepAsync(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
