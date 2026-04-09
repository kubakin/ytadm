/** Normalize channel input (URL, @handle, UC…) to a canonical https URL for links/API. */
export function youtubeChannelToCanonicalUrl(input: string): string {
  const value = input.trim();
  if (!value) {
    return '';
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  if (value.startsWith('@')) {
    return `https://www.youtube.com/${value}`;
  }
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(value)) {
    return `https://www.youtube.com/channel/${value}`;
  }
  return value;
}
