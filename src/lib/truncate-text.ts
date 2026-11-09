/**
 * Avkorter tekst til høyst `max` tegn (UTF-16-enheter, som zod og `LIMITS`). Er teksten lengre,
 * ender resultatet på «…» og er fortsatt innenfor grensen. Et surrogatpar deles aldri.
 */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 1) return max === 1 ? "…" : "";
  let end = max - 1;
  // Ikke del et surrogatpar: dropp en høy halvdel som står sist.
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return `${text.slice(0, end).trimEnd()}…`;
}
