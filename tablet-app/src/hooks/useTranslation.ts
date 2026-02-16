import { useAppStore } from '../store/appStore'
import { translations, TranslationKey } from '../locales/translations'

export function useTranslation() {
  const language = useAppStore((state) => state.language)

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.ru[key] || key
  }

  return { t, language }
}
