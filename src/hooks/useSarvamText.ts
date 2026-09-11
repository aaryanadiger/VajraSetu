import { useCallback, useEffect, useReducer } from 'react';
import { useLanguage } from '../navigation/RootNavigator';
import {
  ensureCachedTranslation,
  getCachedUiText,
  subscribeToTranslationUpdates,
} from '../services/translation';

/**
 * Returns a render-safe translator. It shows English immediately, then swaps
 * to the cached Sarvam result when ready. Repeated text never spends tokens
 * again because `ensureCachedTranslation` is deduplicated and persisted.
 */
export function useSarvamText() {
  const { language } = useLanguage();
  const [, refresh] = useReducer(value => value + 1, 0);

  useEffect(() => subscribeToTranslationUpdates(refresh), []);

  return useCallback((source: string): string => {
    void ensureCachedTranslation(source, language);
    return getCachedUiText(source, language);
  }, [language]);
}
