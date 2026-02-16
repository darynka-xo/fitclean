import { useNavigate } from 'react-router-dom'
import { Package, Truck, HelpCircle, Shirt } from 'lucide-react'
import { Button } from '../components/Button'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useTranslation } from '../hooks/useTranslation'
import { useState } from 'react'

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [showCourierHint, setShowCourierHint] = useState(false)

  // Hidden courier entry - triple tap on logo
  const [tapCount, setTapCount] = useState(0)
  const handleLogoTap = () => {
    const newCount = tapCount + 1
    setTapCount(newCount)
    
    if (newCount >= 3) {
      setTapCount(0)
      navigate('/courier')
    }
    
    // Reset tap count after 2 seconds
    setTimeout(() => setTapCount(0), 2000)
  }

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between p-6 relative z-10">
        <div 
          className="flex items-center gap-4 cursor-pointer"
          onClick={handleLogoTap}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Shirt className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">FitClean</h1>
            <p className="text-gray-400 text-sm">{t('slogan')}</p>
          </div>
        </div>
        
        <LanguageSwitcher />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <h2 className="text-5xl font-bold text-white mb-4 animate-fade-in">
          {t('welcome')}
        </h2>
        <p className="text-xl text-gray-400 mb-16 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {t('slogan')}
        </p>

        <div className="flex gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {/* Dropoff button */}
          <button
            onClick={() => navigate('/dropoff')}
            className="group w-72 h-80 bg-gradient-to-br from-dark-800 to-dark-700 
                       border-2 border-dark-600 hover:border-primary-500 
                       rounded-3xl p-8 flex flex-col items-center justify-center
                       transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20
                       hover:-translate-y-2 active:scale-95"
          >
            <div className="w-24 h-24 bg-primary-500/20 rounded-3xl flex items-center justify-center mb-6 
                          group-hover:bg-primary-500/30 group-hover:scale-110 transition-all duration-300">
              <Package className="w-14 h-14 text-primary-400 group-hover:text-primary-300" />
            </div>
            <span className="text-3xl font-bold text-white mb-2">{t('dropoff')}</span>
            <span className="text-gray-400">Сдать грязную одежду</span>
          </button>

          {/* Pickup button */}
          <button
            onClick={() => navigate('/pickup')}
            className="group w-72 h-80 bg-gradient-to-br from-dark-800 to-dark-700 
                       border-2 border-dark-600 hover:border-primary-500 
                       rounded-3xl p-8 flex flex-col items-center justify-center
                       transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20
                       hover:-translate-y-2 active:scale-95"
          >
            <div className="w-24 h-24 bg-green-500/20 rounded-3xl flex items-center justify-center mb-6 
                          group-hover:bg-green-500/30 group-hover:scale-110 transition-all duration-300">
              <Truck className="w-14 h-14 text-green-400 group-hover:text-green-300" />
            </div>
            <span className="text-3xl font-bold text-white mb-2">{t('pickup')}</span>
            <span className="text-gray-400">Забрать чистую одежду</span>
          </button>
        </div>
      </main>

      {/* Footer with bottom buttons */}
      <footer className="flex items-center justify-between p-6 relative z-10">
        {/* Courier entry (hidden) */}
        <button
          onClick={() => setShowCourierHint(!showCourierHint)}
          className="opacity-0 hover:opacity-30 transition-opacity text-gray-500 text-sm"
        >
          {t('courierEntry')}
        </button>

        {/* Help button */}
        <Button
          variant="ghost"
          size="md"
          icon={<HelpCircle className="w-5 h-5" />}
          onClick={() => {/* Open help modal */}}
        >
          {t('help')}
        </Button>

        {/* Language hint for courier */}
        {showCourierHint && (
          <div className="absolute bottom-20 left-6 bg-dark-700 rounded-xl p-4 text-sm text-gray-400 animate-fade-in">
            Для входа курьера: 3 тапа по логотипу
          </div>
        )}
      </footer>
    </div>
  )
}
