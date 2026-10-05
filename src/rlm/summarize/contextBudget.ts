export const MAX_CONTEXT_CHARS = 24_000;

export function fits(text: string, maxChars: number): boolean {
  return text.length <= maxChars;
}

export function splitIntoFittingParts(text: string, maxChars: number): string[] {
  if (maxChars < 1) {
    throw new Error("Context budget must be at least 1 character");
  }

  if (fits(text, maxChars)) {
    return [text];
  }

  const lines = text.split("\n");
  if (lines.length === 1) {
    return splitOversizedLine(text, maxChars);
  }

  const parts: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    parts.push(current.join("\n"));
    current = [];
  };

  for (const line of lines) {
    if (!fits(line, maxChars)) {
      flush();
      parts.push(...splitOversizedLine(line, maxChars));
      continue;
    }

    const candidate = [...current, line].join("\n");
    if (current.length > 0 && !fits(candidate, maxChars)) {
      flush();
    }

    current.push(line);
  }

  flush();
  return parts;
}

function splitOversizedLine(line: string, maxChars: number): string[] {
  const parts: string[] = [];

  for (let index = 0; index < line.length; index += maxChars) {
    parts.push(line.slice(index, index + maxChars));
  }

  return parts;
}
