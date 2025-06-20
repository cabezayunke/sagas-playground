export async function retry<T>(
  fn: () => Promise<T>,
  retries: number,
  delay: number,
  jitter: number,
  logMessage?: string
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const jitterValue = Math.floor(Math.random() * jitter);
      const waitTime = delay * attempt + jitterValue;
      console.error(
        `Attempt ${attempt} failed. Retrying in ${waitTime}ms... ${logMessage}`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Operation failed after multiple attempts.');
}