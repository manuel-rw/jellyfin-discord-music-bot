import { useDefaultMockerToken } from './defaultMockerToken';

describe('defaultMockerToken', () => {
  it('useDefaultMockerTokenShouldBeNull', () => {
    const mockerToken = useDefaultMockerToken('test');

    expect(mockerToken).toBeNull();
  });

  it('useDefaultMockerTokenShouldReturnNull', () => {
    const mockerToken = useDefaultMockerToken(() => ({
      test: () => jest.fn(),
    }));

    expect(mockerToken).not.toBeNull();
  });
});
