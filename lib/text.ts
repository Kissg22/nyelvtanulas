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

/**
 * Keeps deliberate paragraphs. If the user pasted one long block, it creates
 * visual paragraphs of up to three sentences so half-page texts stay readable.
 */
export function formatReadingParagraphs(text: string, lang: 'en' | 'de'): string[][] {
  const rawParagraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

  if (!rawParagraphs.length) return [];

  if (rawParagraphs.length === 1) {
    const sentences = segmentSentences(rawParagraphs[0], lang);
    if (sentences.length > 4) {
      const chunks: string[][] = [];
      for (let i = 0; i < sentences.length; i += 3) chunks.push(sentences.slice(i, i + 3));
      return chunks;
    }
  }

  return rawParagraphs.map((paragraph) => segmentSentences(paragraph, lang));
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
