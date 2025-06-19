import { retry } from '../../src/common/retry.helper';

describe('retry', () => {
  it('should succeed if function passes', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retry(fn, 3, 10, 5);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and eventually throw if all attempts fail', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(retry(fn, 2, 1, 1)).rejects.toThrow('Operation failed after multiple attempts.');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});