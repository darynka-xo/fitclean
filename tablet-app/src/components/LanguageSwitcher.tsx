import { Globe } from 'lucide-react'
import { useAppStore, type Language } from '../store/appStore'

interface LanguageSwitcherProps {
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LanguageSwitcher({ showLabel = true, size = 'md' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useAppStore()

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'kk', label: 'Қазақша', flag: '🇰🇿' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ]

  const sizeClasses = {
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-2 px-3',
    lg: 'text-lg py-3 px-4',
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <Globe className="w-5 h-5 text-gray-400" />
      )}
      <div className="flex rounded-xl overflow-hidden border border-dark-600">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`
              ${sizeClasses[size]}
              transition-all duration-200
              ${language === lang.code 
                ? 'bg-primary-500 text-white' 
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }
            `}
          >
            <span className="mr-1">{lang.flag}</span>
            {showLabel && <span className="hidden sm:inline">{lang.label}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
