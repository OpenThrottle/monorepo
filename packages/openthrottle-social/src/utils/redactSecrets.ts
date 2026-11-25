/** @description Secrets shorter than this are not worth masking and would mangle ordinary words. */
const MIN_SECRET_LENGTH = 8;

/**
 * @description `text` with every occurrence of each secret replaced by `[redacted]`. Every line
 * this package prints or writes to a task passes through here first, so a token that ends up in
 * an error message from X still never reaches a scheduled-job log or a task summary.
 * @public
 */
export const redactSecrets = (
  text: string,
  secrets: ReadonlyArray<string | undefined>,
): string => {
  return secrets
    .filter((secret): secret is string => {
      return secret !== undefined && secret.length >= MIN_SECRET_LENGTH;
    })
    .sort((a, b) => b.length - a.length)
    .reduce((redacted, secret) => {
      return redacted.split(secret).join('[redacted]');
    }, text);
};
