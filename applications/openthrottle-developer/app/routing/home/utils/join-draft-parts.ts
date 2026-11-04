/** Join the frozen prefix and a Whisper transcript without doubled spaces. */
export function joinDraftParts(prefix: string, transcript: string): string {
  const trimmedTranscript = transcript.trim();
  if (prefix === '') {
    return trimmedTranscript;
  }
  if (trimmedTranscript === '') {
    return prefix;
  }

  return `${prefix.replace(/\s+$/, '')} ${trimmedTranscript}`;
}
