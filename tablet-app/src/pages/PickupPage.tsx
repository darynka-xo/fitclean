import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2, ThumbsUp, ThumbsDown, ScanLine } from 'lucide-react'
import { Button } from '../components/Button'
import { NumPad, PinDots } from '../components/NumPad'
import { SingleCell } from '../components/CellGrid'
import { useTranslation } from '../hooks/useTranslation'
import { useAppStore, type Cell as CellType } from '../store/appStore'
import { lockerApi } from '../api/lockerApi'

// MOCK MODE - всё фиктивное для демо
const MOCK_MODE = true

type Step = 
  | 'code' 
  | 'verifying' 
  | 'cell-opening' 
  | 'cell-open' 
  | 'waiting-close' 
  | 'rating' 
  | 'success'

export default function PickupPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { reset } = useAppStore()

  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [openedCell, setOpenedCell] = useState<CellType | null>(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [error, setError] = useState('')
  const [rating, setRating] = useState<'good' | 'bad' | null>(null)

  // Handle code complete
  const handleCodeComplete = async (value: string) => {
    if (MOCK_MODE) {
      // MOCK: Любой 4-значный код работает
      console.log(`🎫 [MOCK] Pickup code entered: ${value}`)
      setStep('verifying')
      
      // Simulate verification delay
      setTimeout(() => {
        setOrderNumber(`FC-${Date.now() - 86400000}`) // Order from yesterday
        openCellMock()
      }, 1000)
      return
    }
    
    setStep('verifying')
    
    try {
      const response = await fetch('/api/orders/verify-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setOrderNumber(data.orderNumber)
        await openCell(data.cellId, data.cellNumber)
      } else {
        setError(t('invalidCode'))
        setCode('')
        setStep('code')
      }
    } catch {
      // Fallback to mock
      setOrderNumber(`FC-${Date.now()}`)
      openCellMock()
    }
  }

  // Mock cell opening
  const openCellMock = async () => {
    setStep('cell-opening')
    
    // Try real locker first
    try {
      const result = await lockerApi.openAvailableCell('M', 'client')
      
      const cellData: CellType = {
        id: result.cellId,
        number: result.cellNumber,
        size: 'M',
        status: 'open',
      }
      
      setOpenedCell(cellData)
      setStep('cell-open')
      
      // Wait for door close
      const closed = await lockerApi.waitForDoorClose(result.cellId, 60000)
      
      if (closed) {
        await lockerApi.releaseCell(result.cellId)
        setStep('rating')
      }
    } catch {
      // Full mock fallback
      console.log('🔓 [MOCK] Opening cell...')
      
      setTimeout(() => {
        const demoCell: CellType = {
          id: 'cell-12',
          number: 12,
          size: 'M',
          status: 'open',
        }
        setOpenedCell(demoCell)
        setStep('cell-open')
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          setStep('waiting-close')
          setTimeout(() => {
            console.log('🔒 [MOCK] Cell closed')
            setStep('rating')
          }, 2000)
        }, 3000)
      }, 1000)
    }
  }

  const openCell = async (cellId: string, cellNumber: number) => {
    setStep('cell-opening')
    
    try {
      await lockerApi.openCell(cellId, 'client')
      
      const cellData: CellType = {
        id: cellId,
        number: cellNumber,
        size: 'M',
        status: 'open',
      }
      
      setOpenedCell(cellData)
      setStep('cell-open')
      
      const closed = await lockerApi.waitForDoorClose(cellId, 60000)
      
      if (closed) {
        await lockerApi.releaseCell(cellId)
        setStep('rating')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to open cell')
      setStep('code')
    }
  }

  const handleRating = async (value: 'good' | 'bad') => {
    setRating(value)
    
    if (MOCK_MODE) {
      console.log(`⭐ [MOCK] Rating: ${value}`)
      setStep('success')
      return
    }
    
    try {
      await fetch('/api/orders/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderNumber,
          rating: value,
        }),
      })
    } catch (err) {
      console.error(err)
    }
    
    setStep('success')
  }

  const handleBack = () => {
    if (step === 'code') {
      reset()
      navigate('/')
    } else {
      setCode('')
      setError('')
      setStep('code')
    }
  }

  const handleFinish = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      {step === 'code' && (
        <header className="flex items-center p-6">
          <Button variant="ghost" size="md" onClick={handleBack}>
            <ArrowLeft className="w-6 h-6 mr-2" />
            {t('back')}
          </Button>
          
          <h1 className="flex-1 text-center text-2xl font-bold text-white">
            {t('pickup')}
          </h1>
          
          <div className="w-24" />
        </header>
      )}

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Code entry step */}
        {step === 'code' && (
          <div className="w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-center gap-4 mb-8">
              <ScanLine className="w-12 h-12 text-primary-400" />
              <h2 className="text-3xl font-bold text-white">
                {t('scanOrEnterCode')}
              </h2>
            </div>
            
            <p className="text-gray-400 text-center mb-8">
              {t('enterPickupCode')}
            </p>
            
            <PinDots length={4} filled={code.length} error={!!error} />
            
            {error && (
              <p className="text-red-500 text-center mb-4 animate-shake">{error}</p>
            )}
            
            <NumPad 
              value={code} 
              onChange={(v) => { setCode(v); setError(''); }}
              maxLength={4}
              onComplete={handleCodeComplete}
            />
            
            {MOCK_MODE && (
              <p className="text-yellow-500 text-center mt-6 text-sm">
                🎬 Демо: введите любые 4 цифры
              </p>
            )}
          </div>
        )}

        {/* Verifying step */}
        {step === 'verifying' && (
          <div className="text-center animate-fade-in">
            <Loader2 className="w-24 h-24 text-primary-500 animate-spin mx-auto mb-8" />
            <h2 className="text-3xl font-bold text-white">
              {t('loading')}
            </h2>
            {MOCK_MODE && (
              <p className="text-yellow-500 mt-4">🎬 Проверяем код...</p>
            )}
          </div>
        )}

        {/* Cell opening step */}
        {step === 'cell-opening' && (
          <div className="text-center animate-fade-in">
            <Loader2 className="w-24 h-24 text-primary-500 animate-spin mx-auto mb-8" />
            <h2 className="text-3xl font-bold text-white">
              {t('cellOpening')}
            </h2>
          </div>
        )}

        {/* Cell open step */}
        {(step === 'cell-open' || step === 'waiting-close') && openedCell && (
          <div className="text-center animate-fade-in">
            <h2 className="text-4xl font-bold text-white mb-8">
              {t('yourItemsReady')}
            </h2>
            
            <SingleCell cell={openedCell} isOpen={step === 'cell-open'} />
            
            <h3 className="text-2xl font-bold text-white mt-8 mb-4">
              {step === 'cell-open' ? t('takeItems') : t('waitingDoorClose')}
            </h3>
            <p className="text-xl text-gray-400">
              {t('cellNumber')}{openedCell.number}
            </p>
            
            {step === 'waiting-close' && (
              <div className="flex items-center justify-center gap-3 text-primary-400 mt-8">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('closeCell')}
              </div>
            )}
            
            {MOCK_MODE && step === 'cell-open' && (
              <p className="text-yellow-500 mt-6 text-sm">
                🎬 Демо: дверь закроется автоматически через 3 сек
              </p>
            )}
          </div>
        )}

        {/* Rating step */}
        {step === 'rating' && (
          <div className="text-center animate-fade-in">
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('rateService')}
            </h2>
            <p className="text-gray-400 mb-12">
              Ваш отзыв поможет нам стать лучше
            </p>
            
            <div className="flex gap-8 justify-center">
              <button
                onClick={() => handleRating('good')}
                className={`
                  w-32 h-32 rounded-3xl flex flex-col items-center justify-center
                  transition-all duration-200 transform hover:scale-110 active:scale-95
                  ${rating === 'good' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-dark-700 border-2 border-dark-600 text-gray-400 hover:border-green-500'
                  }
                `}
              >
                <ThumbsUp className="w-12 h-12 mb-2" />
                <span className="text-lg font-medium">Отлично</span>
              </button>
              
              <button
                onClick={() => handleRating('bad')}
                className={`
                  w-32 h-32 rounded-3xl flex flex-col items-center justify-center
                  transition-all duration-200 transform hover:scale-110 active:scale-95
                  ${rating === 'bad' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-dark-700 border-2 border-dark-600 text-gray-400 hover:border-red-500'
                  }
                `}
              >
                <ThumbsDown className="w-12 h-12 mb-2" />
                <span className="text-lg font-medium">Плохо</span>
              </button>
            </div>
            
            <button 
              className="mt-8 text-gray-500 hover:text-gray-400"
              onClick={() => setStep('success')}
            >
              Пропустить
            </button>
          </div>
        )}

        {/* Success step */}
        {step === 'success' && (
          <div className="text-center animate-fade-in">
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-scale-in">
              <Check className="w-20 h-20 text-white" />
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('orderCompleted')}
            </h2>
            
            <p className="text-2xl text-gray-300 mb-2">
              Заказ: <span className="text-primary-400">{orderNumber}</span>
            </p>
            
            <p className="text-xl text-gray-400 mb-8">
              {t('thankYou')}
            </p>
            
            <Button size="xl" onClick={handleFinish}>
              {t('backToHome')}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
