import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '../components/Button'
import { PhoneInput } from '../components/PhoneInput'
import { NumPad, PinDots } from '../components/NumPad'
import { SingleCell } from '../components/CellGrid'
import { useTranslation } from '../hooks/useTranslation'
import { useAppStore, type Cell as CellType } from '../store/appStore'
import { lockerApi } from '../api/lockerApi'
import { kaspiApi, type KaspiPayment } from '../api/kaspiApi'
import { whatsappApi } from '../api/whatsappApi'

// MOCK MODE - всё фиктивное для демо
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || true // Always mock for now

type Step = 
  | 'phone' 
  | 'otp' 
  | 'register' 
  | 'pin' 
  | 'payment' 
  | 'payment-qr' 
  | 'cell-opening' 
  | 'cell-open' 
  | 'waiting-close' 
  | 'success'

interface Plan {
  id: string
  name: string
  price: number
  washes: number
  popular?: boolean
}

const plans: Plan[] = [
  { id: 'single', name: 'singleWash', price: 1500, washes: 1 },
  { id: 'pack4', name: 'pack4', price: 5000, washes: 4, popular: true },
  { id: 'pack8', name: 'pack8', price: 9000, washes: 8 },
]

export default function DropoffPage() {
  const navigate = useNavigate()
  const { t, language } = useTranslation()
  const { cells, setCells, setCurrentUser, setCurrentOrder, reset } = useAppStore()

  // State
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('+7')
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('') // Store generated OTP
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinStep, setPinStep] = useState<'first' | 'confirm'>('first') // Track PIN entry stage
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [payment, setPayment] = useState<KaspiPayment | null>(null)
  const [qrImage, setQrImage] = useState<string>('')
  const [openedCell, setOpenedCell] = useState<CellType | null>(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (payment) {
        kaspiApi.stopPolling(payment.qrPaymentId)
      }
    }
  }, [payment])

  // Phone submit - в MOCK режиме всегда новый пользователь
  const handlePhoneSubmit = async () => {
    if (phone.replace(/\D/g, '').length !== 11) return
    
    setLoading(true)
    setError('')
    
    if (MOCK_MODE) {
      // MOCK: Генерируем OTP и сразу показываем его
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      setGeneratedOtp(code)
      console.log(`📱 [DEMO] OTP код: ${code}`)
      
      // Показываем алерт с кодом для удобства демо
      alert(`📱 Демо-режим!\n\nВаш код подтверждения: ${code}`)
      
      setIsNewUser(true)
      await whatsappApi.sendOTP(phone.replace(/\D/g, ''), code, language)
      setStep('otp')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, '') }),
      })
      
      const data = await response.json()
      setIsNewUser(!data.exists)
      
      if (data.exists) {
        setStep('pin')
      } else {
        const code = Math.floor(1000 + Math.random() * 9000).toString()
        setGeneratedOtp(code)
        await whatsappApi.sendOTP(phone.replace(/\D/g, ''), code, language)
        setStep('otp')
      }
    } catch (err) {
      console.error(err)
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      setGeneratedOtp(code)
      alert(`📱 Демо-режим! Код: ${code}`)
      setStep('otp')
    } finally {
      setLoading(false)
    }
  }

  // OTP verify - в MOCK режиме принимаем сгенерированный код
  const handleOtpComplete = (value: string) => {
    if (MOCK_MODE) {
      if (value === generatedOtp || value === '1234') {
        setStep('register')
        setError('')
      } else {
        setError(`Неверный код. Подсказка: ${generatedOtp}`)
        setOtp('')
      }
      return
    }
    
    if (value === generatedOtp) {
      setStep('register')
    } else {
      setError(t('invalidCode'))
      setOtp('')
    }
  }

  // Registration submit
  const handleRegisterSubmit = () => {
    if (!name.trim() || !agreedToTerms) return
    setStep('pin')
  }

  // PIN creation
  const handlePinComplete = (value: string) => {
    if (!isNewUser) {
      // Existing user - verify PIN
      verifyPin(value)
    } else if (pinStep === 'first') {
      // New user - first PIN entry
      setPin(value)
      setPinStep('confirm')
    } else {
      // New user - confirm PIN
      if (value === pin) {
        createUser()
      } else {
        setError(t('pinMismatch'))
        setPin('')
        setPinConfirm('')
        setPinStep('first')
      }
    }
  }

  const verifyPin = async (value: string) => {
    setLoading(true)
    
    if (MOCK_MODE) {
      // MOCK: Любой PIN подходит
      setCurrentUser({
        id: 'demo-user',
        phone: phone.replace(/\D/g, ''),
        name: 'Demo User',
      })
      setStep('payment')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/users/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: phone.replace(/\D/g, ''), 
          pin: value 
        }),
      })
      
      if (response.ok) {
        const user = await response.json()
        setCurrentUser(user)
        setStep('payment')
      } else {
        setError(t('invalidCode'))
        setPin('')
      }
    } catch {
      setCurrentUser({
        id: 'demo-user',
        phone: phone.replace(/\D/g, ''),
        name: 'Demo User',
      })
      setStep('payment')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    setLoading(true)
    
    if (MOCK_MODE) {
      setCurrentUser({
        id: 'demo-user',
        phone: phone.replace(/\D/g, ''),
        name,
        email,
      })
      setStep('payment')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          name,
          email,
          pin,
        }),
      })
      
      if (response.ok) {
        const user = await response.json()
        setCurrentUser(user)
      }
    } catch {
      setCurrentUser({
        id: 'demo-user',
        phone: phone.replace(/\D/g, ''),
        name,
        email,
      })
    } finally {
      setLoading(false)
      setStep('payment')
    }
  }

  // Payment - в MOCK режиме показываем QR и сразу подтверждаем
  const handleSelectPlan = async (plan: Plan) => {
    setSelectedPlan(plan)
    setLoading(true)
    
    const orderId = `FC-${Date.now()}`
    setOrderNumber(orderId)
    
    try {
      const paymentRequest = await kaspiApi.createPayment({
        amount: plan.price,
        orderId,
        description: `FitClean - ${t(plan.name as never)}`,
      })
      
      setPayment(paymentRequest)
      
      // Generate QR image
      const qr = await kaspiApi.generateQRImage(paymentRequest.qrLink)
      setQrImage(qr)
      
      setStep('payment-qr')
      setLoading(false)
      
      // Wait for payment (in MOCK mode - 2 seconds)
      kaspiApi.waitForPayment(paymentRequest.qrPaymentId)
        .then(() => {
          openCell()
        })
        .catch((err) => {
          console.error('Payment failed:', err)
          setError(t('paymentFailed'))
          setStep('payment')
        })
    } catch (err) {
      console.error(err)
      setLoading(false)
      // Even on error, proceed with demo
      openCell()
    }
  }

  // Open cell
  const openCell = async () => {
    setStep('cell-opening')
    
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
        const updatedCells = cells.map(c => 
          c.id === result.cellId ? { ...c, status: 'occupied' as const } : c
        )
        setCells(updatedCells)
        
        await createOrder(result.cellId, result.cellNumber)
        setStep('success')
      }
    } catch (err) {
      console.error(err)
      // Demo fallback
      const demoCell: CellType = {
        id: 'cell-5',
        number: 5,
        size: 'M',
        status: 'open',
      }
      setOpenedCell(demoCell)
      setStep('cell-open')
      
      // Auto-complete after 3 seconds
      setTimeout(() => {
        setStep('waiting-close')
        setTimeout(() => {
          createOrder('cell-5', 5)
          setStep('success')
        }, 2000)
      }, 3000)
    }
  }

  const createOrder = async (cellId: string, cellNumber: number) => {
    try {
      const order = {
        id: orderNumber,
        orderNumber,
        userId: 'demo-user',
        status: 'in_locker' as const,
        cellId,
        createdAt: new Date().toISOString(),
      }
      
      setCurrentOrder(order)
      
      await whatsappApi.sendOrderReceived(
        phone.replace(/\D/g, ''),
        orderNumber,
        cellNumber,
        language
      )
    } catch (err) {
      console.error('Failed to create order:', err)
    }
  }

  const handleBack = () => {
    if (step === 'phone') {
      reset()
      navigate('/')
    } else if (step === 'otp') {
      setOtp('')
      setStep('phone')
    } else if (step === 'register') {
      setStep('otp')
    } else if (step === 'pin') {
      if (isNewUser && pinStep === 'confirm') {
        // Go back to first PIN entry
        setPinConfirm('')
        setPinStep('first')
      } else {
        // Go back to previous screen
        setPin('')
        setPinConfirm('')
        setPinStep('first')
        setStep(isNewUser ? 'register' : 'phone')
      }
    } else if (step === 'payment') {
      setStep('pin')
    } else if (step === 'payment-qr') {
      if (payment) {
        kaspiApi.cancelPayment(payment.qrPaymentId)
      }
      setStep('payment')
    }
  }

  const handleFinish = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      {step !== 'success' && step !== 'cell-opening' && step !== 'cell-open' && step !== 'waiting-close' && (
        <header className="flex items-center p-6">
          <Button variant="ghost" size="md" onClick={handleBack}>
            <ArrowLeft className="w-6 h-6 mr-2" />
            {t('back')}
          </Button>
          
          <h1 className="flex-1 text-center text-2xl font-bold text-white">
            {t('dropoff')}
          </h1>
          
          <div className="w-24" />
        </header>
      )}

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Phone step */}
        {step === 'phone' && (
          <div className="w-full max-w-md animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              {t('enterPhone')}
            </h2>
            <p className="text-gray-400 text-center mb-8">
              {t('phoneHint')}
            </p>
            
            <PhoneInput
              value={phone}
              onChange={setPhone}
              onSubmit={handlePhoneSubmit}
              autoFocus
            />
            
            <Button
              className="w-full mt-8"
              size="xl"
              onClick={handlePhoneSubmit}
              loading={loading}
              disabled={phone.replace(/\D/g, '').length !== 11}
            >
              {t('sendCode')}
            </Button>
            
            {MOCK_MODE && (
              <p className="text-yellow-500 text-center mt-4 text-sm">
                🎬 Демо-режим: код появится в alert
              </p>
            )}
          </div>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <div className="w-full max-w-md animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              {t('enterCode')}
            </h2>
            <p className="text-gray-400 text-center mb-8">
              {phone}
            </p>
            
            <PinDots length={4} filled={otp.length} error={!!error} />
            
            {error && (
              <p className="text-red-500 text-center mb-4">{error}</p>
            )}
            
            <NumPad 
              value={otp} 
              onChange={(v) => { setOtp(v); setError(''); }}
              maxLength={4}
              onComplete={handleOtpComplete}
            />
            
            {MOCK_MODE && generatedOtp && (
              <p className="text-yellow-500 text-center mt-4">
                🎬 Демо-код: <strong>{generatedOtp}</strong>
              </p>
            )}
          </div>
        )}

        {/* Registration step */}
        {step === 'register' && (
          <div className="w-full max-w-md animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              {t('registration')}
            </h2>
            
            <div className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('yourName')}
                className="input-field"
                autoFocus
              />
              
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('yourEmail')}
                className="input-field"
              />
              
              <label className="flex items-center gap-3 cursor-pointer mt-6">
                <div 
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all
                    ${agreedToTerms ? 'bg-primary-500 border-primary-500' : 'border-gray-500'}`}
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                >
                  {agreedToTerms && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-gray-300">{t('agreeToTerms')}</span>
              </label>
              
              <a href="#" className="text-primary-400 text-sm hover:underline">
                {t('viewTerms')}
              </a>
            </div>
            
            <Button
              className="w-full mt-8"
              size="xl"
              onClick={handleRegisterSubmit}
              disabled={!name.trim() || !agreedToTerms}
            >
              {t('continue')}
            </Button>
          </div>
        )}

        {/* PIN step */}
        {step === 'pin' && (
          <div className="w-full max-w-md animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              {isNewUser 
                ? (pinStep === 'confirm' ? t('confirmPin') : t('createPin')) 
                : t('enterPin')
              }
            </h2>
            {isNewUser && pinStep === 'first' && (
              <p className="text-gray-400 text-center mb-8">{t('pinHint')}</p>
            )}
            
            <PinDots 
              length={4} 
              filled={
                isNewUser 
                  ? (pinStep === 'confirm' ? pinConfirm.length : pin.length)
                  : pin.length
              } 
              error={!!error} 
            />
            
            {error && (
              <p className="text-red-500 text-center mb-4">{error}</p>
            )}
            
            <NumPad 
              value={
                isNewUser 
                  ? (pinStep === 'confirm' ? pinConfirm : pin)
                  : pin
              } 
              onChange={(v) => {
                setError('')
                if (isNewUser && pinStep === 'confirm') {
                  setPinConfirm(v)
                } else {
                  setPin(v)
                }
              }}
              maxLength={4}
              onComplete={handlePinComplete}
            />
          </div>
        )}

        {/* Payment step */}
        {step === 'payment' && (
          <div className="w-full max-w-2xl animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              {t('selectPlan')}
            </h2>
            
            {error && (
              <p className="text-red-500 text-center mb-4">{error}</p>
            )}
            
            <div className="grid grid-cols-3 gap-6">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loading}
                  className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-200
                    ${plan.popular 
                      ? 'border-primary-500 bg-primary-500/10' 
                      : 'border-dark-600 bg-dark-700/50 hover:border-dark-500'
                    }
                    ${loading ? 'opacity-50' : 'hover:scale-105 active:scale-95'}
                  `}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs px-3 py-1 rounded-full">
                      Популярное
                    </div>
                  )}
                  
                  <div className="text-4xl font-bold text-white mb-2">
                    {plan.price.toLocaleString()} {t('tenge')}
                  </div>
                  <div className="text-lg text-gray-300 mb-4">
                    {t(plan.name as never)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {plan.washes} {plan.washes === 1 ? 'стирка' : 'стирок'}
                  </div>
                </button>
              ))}
            </div>
            
            {MOCK_MODE && (
              <p className="text-yellow-500 text-center mt-6 text-sm">
                🎬 Демо: оплата пройдёт автоматически через 2 сек
              </p>
            )}
          </div>
        )}

        {/* Payment QR step */}
        {step === 'payment-qr' && (
          <div className="text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('scanQR')}
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              {selectedPlan?.price.toLocaleString()} {t('tenge')}
            </p>
            
            <div className="bg-white p-4 rounded-2xl inline-block mb-8">
              {qrImage ? (
                <img src={qrImage} alt="Kaspi QR" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('waitingPayment')}
            </div>
            
            {MOCK_MODE && (
              <p className="text-yellow-500 mt-4 text-sm">
                🎬 Демо: оплата подтвердится автоматически...
              </p>
            )}
            
            <Button variant="secondary" className="mt-8" onClick={handleBack}>
              {t('cancel')}
            </Button>
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
            <SingleCell cell={openedCell} isOpen={step === 'cell-open'} />
            
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              {step === 'cell-open' ? t('putClothes') : t('waitingDoorClose')}
            </h2>
            <p className="text-xl text-gray-400">
              {t('cellNumber')}{openedCell.number}
            </p>
            
            {step === 'waiting-close' && (
              <div className="flex items-center justify-center gap-3 text-primary-400 mt-8">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('closeCell')}
              </div>
            )}
          </div>
        )}

        {/* Success step */}
        {step === 'success' && (
          <div className="text-center animate-fade-in">
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-scale-in">
              <Check className="w-20 h-20 text-white" />
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('orderReceived')}
            </h2>
            
            <p className="text-2xl text-gray-300 mb-2">
              {t('orderNumber')}: <span className="font-bold text-primary-400">{orderNumber}</span>
            </p>
            
            {openedCell && (
              <p className="text-xl text-gray-400 mb-8">
                {t('cellNumber')}{openedCell.number}
              </p>
            )}
            
            <p className="text-gray-400 mb-8">
              {t('notificationSent')}
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
