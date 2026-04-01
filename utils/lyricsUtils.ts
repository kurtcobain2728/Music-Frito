export interface LyricsLine {
  time: number;
  text: string;
}

export type LyricsType = 'synchronized' | 'unsynchronized' | 'none';

export interface ParsedLyrics {
  type: LyricsType;
  lines: LyricsLine[];
  rawText: string;
}

export function parseLrc(rawLrc: string): ParsedLyrics {
  if (!rawLrc || !rawLrc.trim()) {
    return { type: 'none', lines: [], rawText: '' };
  }

  const lines: LyricsLine[] = [];
  const lrcLineRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)/;

  const rawLines = rawLrc.split('\n');

  for (const line of rawLines) {
    const match = line.match(lrcLineRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = minutes * 60000 + seconds * 1000 + centiseconds;
      const text = match[4].trim();
      if (text) {
        lines.push({ time, text });
      }
    }
  }

  if (lines.length > 0) {
    lines.sort((a, b) => a.time - b.time);
    return { type: 'synchronized', lines, rawText: rawLrc };
  }

  const plainLines = rawLrc
    .split('\n')
    .map(l => l.replace(/\[.*?\]/g, '').trim())
    .filter(Boolean);

  if (plainLines.length > 0) {
    return {
      type: 'unsynchronized',
      lines: plainLines.map((text, i) => ({ time: i, text })),
      rawText: rawLrc,
    };
  }

  return { type: 'none', lines: [], rawText: rawLrc };
}

export function findActiveLine(lines: LyricsLine[], positionMs: number): number {
  if (lines.length === 0) return -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (positionMs >= lines[i].time) {
      return i;
    }
  }

  return -1;
}
