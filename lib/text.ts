export function segmentSentences(text: string, lang: 'en' | 'de'): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  try {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new Intl.Segmenter(lang, { granularity: 'sentence' });
      return Array.from(segmenter.segment(clean))
        .map((item) => item.segment.trim())
        .filter(Boolean);
    }
  } catch {
    // Fallback below.
  }

  return clean.match(/[^.!?\n]+(?:[.!?]+[”"']?|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
}

export function normalizeWord(word: string) {
  return word
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’-]+$/gu, '')
    .trim();
}

export function tokenizeSentence(sentence: string) {
  return sentence.split(/(\s+|[^\p{L}\p{N}'’-]+)/gu).filter((part) => part !== '');
}

export function isWordToken(token: string) {
  return /[\p{L}\p{N}]/u.test(token);
}
