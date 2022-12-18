import { formatDuration, intervalToDuration } from 'date-fns';

export const formatMillisecondsAsHumanReadable = (milliseconds: number) => {
  const duration = formatDuration(
    intervalToDuration({
      start: milliseconds,
      end: 0,
    }),
  );
  return duration;
};
