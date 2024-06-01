import { formatDuration, intervalToDuration } from 'date-fns';

export const formatMillisecondsAsHumanReadable = (
  milliseconds: number,
  format = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'],
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
