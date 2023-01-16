import { trimStringToFixedLength } from './stringUtils';

describe('stringUtils', () => {
  it('trimStringToFixedLengthShouldNotTrim', () => {
    const trimmedString = trimStringToFixedLength('test', 20);

    expect(trimmedString).toBe('test');
  });

  it('trimStringToFixedLengthShouldThrowError', () => {
    const action = () => {
      trimStringToFixedLength('testing value', 0);
    };

    expect(action).toThrow(Error);
  });

  it('trimStringToFixedLengthShouldTrimWhenLengthExceeded', () => {
    const trimmedString = trimStringToFixedLength('hello world', 5);

    expect(trimmedString).toBe('he...');
  });
});
