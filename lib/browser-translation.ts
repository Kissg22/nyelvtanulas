type TranslationLanguage = 'en' | 'de';
type TranslatorAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';
type BrowserTranslator = { translate(text: string): Promise<string>; destroy?: () => void };
type TranslatorFactory = {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorAvailability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: { addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void }) => void;
  }): Promise<BrowserTranslator>;
};

const instances = new Map<TranslationLanguage, Promise<BrowserTranslator>>();

function getFactory(): TranslatorFactory | null {
  if (typeof window === 'undefined') return null;
  return (globalThis as unknown as { Translator?: TranslatorFactory }).Translator ?? null;
}

export async function browserTranslatorAvailable(language: TranslationLanguage) {
  const factory = getFactory();
  if (!factory) return false;
  const availability = await factory.availability({ sourceLanguage: language, targetLanguage: 'hu' });
  return availability !== 'unavailable';
}

export async function translateInBrowser(
  language: TranslationLanguage,
  text: string,
  onDownloadProgress?: (progress: number) => void,
): Promise<string> {
  const factory = getFactory();
  if (!factory) throw new Error('BROWSER_TRANSLATOR_UNAVAILABLE');

  let instance = instances.get(language);
  if (!instance) {
    instance = factory.create({
      sourceLanguage: language,
      targetLanguage: 'hu',
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', (event) => onDownloadProgress?.(event.loaded));
      },
    });
    instances.set(language, instance);
  }

  const translator = await instance;
  return (await translator.translate(text)).trim();
}
