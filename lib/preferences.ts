export type ReaderPreferences = {
  en_voice_uri: string | null;
  de_voice_uri: string | null;
  speech_rate: number;
  speech_pitch: number;
  auto_sentence_audio: boolean;
  show_translation: boolean;
  font_size: number;
  line_height: number;
};

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  en_voice_uri: null,
  de_voice_uri: null,
  speech_rate: 0.95,
  speech_pitch: 1,
  auto_sentence_audio: true,
  show_translation: true,
  font_size: 20,
  line_height: 1.85,
};

export const PREFERENCES_KEY = 'linguahover-reader-preferences-v2';

export function loadPreferences(): ReaderPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
