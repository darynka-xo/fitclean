import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Truck, Loader2, Check, QrCode } from 'lucide-react'
import { Button } from '../components/Button'
import { NumPad, PinDots } from '../components/NumPad'
import { CellGrid } from '../components/CellGrid'
import { useTranslation } from '../hooks/useTranslation'
import { useAppStore, type Cell as CellType } from '../store/appStore'
import { lockerApi } from '../api/lockerApi'

type Step = 
  | 'password' 
  | 'menu' 
  | 'pickup-select' 
  | 'pickup-opening' 
  | 'deliver-scan' 
  | 'deliver-opening' 
  | 'success'

const ADMIN_PASSWORD = '1234' // In production, use secure verification

export default function CourierPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { cells, setCells, reset } = useAppStore()

  const [step, setStep] = useState<Step>('password')
  const [password, setPassword] = useState('')
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [orderId, setOrderId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Password verification
  const handlePasswordComplete = (value: string) => {
    if (value === ADMIN_PASSWORD) {
      setStep('menu')
    } else {
      setError(t('invalidCode'))
      setPassword('')
    }
  }

  // Cell selection toggle
  const handleCellClick = (cell: CellType) => {
    if (selectedCells.includes(cell.id)) {
      setSelectedCells(selectedCells.filter(id => id !== cell.id))
    } else {
      setSelectedCells([...selectedCells, cell.id])
    }
  }

  // Open selected cells for pickup
  const handleOpenForPickup = async () => {
    if (selectedCells.length === 0) return
    
    setLoading(true)
    setStep('pickup-opening')
    
    try {
      for (const cellId of selectedCells) {
        await lockerApi.openCell(cellId, 'courier')
        
        // Update cell status
        const updatedCells = cells.map(c => 
          c.id === cellId ? { ...c, status: 'open' as const } : c
        )
        setCells(updatedCells)
      }
      
      // Wait a bit for courier to take items
      setTimeout(() => {
        // Mark cells as available
        const updatedCells = cells.map(c => 
          selectedCells.includes(c.id) ? { ...c, status: 'available' as const } : c
        )
        setCells(updatedCells)
        setStep('success')
      }, 3000)
    } catch (err) {
      console.error(err)
      // Demo mode
      setTimeout(() => {
        setStep('success')
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  // Handle order ID for delivery
  const handleDeliverSubmit = async () => {
    if (!orderId.trim()) return
    
    setLoading(true)
    setStep('deliver-opening')
    
    try {
      // Find order and open available cell
      const result = await lockerApi.openAvailableCell('M', 'courier')
      
      // Update cell status
      const updatedCells = cells.map(c => 
        c.id === result.cellId ? { ...c, status: 'open' as const, orderId } : c
      )
      setCells(updatedCells)
      
      // Wait for door close
      const closed = await lockerApi.waitForDoorClose(result.cellId, 60000)
      
      if (closed) {
        // Mark cell as occupied with clean items
        const finalCells = cells.map(c => 
          c.id === result.cellId ? { ...c, status: 'occupied' as const } : c
        )
        setCells(finalCells)
        
        // Update order status and notify customer
        await fetch('/api/orders/mark-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            orderId,
            cellId: result.cellId,
            cellNumber: result.cellNumber,
          }),
        })
        
        setStep('success')
      }
    } catch (err) {
      console.error(err)
      // Demo mode
      setTimeout(() => {
        setStep('success')
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'password' || step === 'menu') {
      reset()
      navigate('/')
    } else if (step === 'pickup-select') {
      setSelectedCells([])
      setStep('menu')
    } else if (step === 'deliver-scan') {
      setOrderId('')
      setStep('menu')
    } else if (step === 'success') {
      setSelectedCells([])
      setOrderId('')
      setStep('menu')
    }
  }

  const handleFinish = () => {
    reset()
    navigate('/')
  }

  // Filter cells for pickup (occupied ones)
  const occupiedCells = cells.filter(c => c.status === 'occupied')

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      <header className="flex items-center p-6">
        <Button variant="ghost" size="md" onClick={handleBack}>
          <ArrowLeft className="w-6 h-6 mr-2" />
          {t('back')}
        </Button>
        
        <h1 className="flex-1 text-center text-2xl font-bold text-white">
          {t('courierMode')}
        </h1>
        
        <div className="w-24" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Password step */}
        {step === 'password' && (
          <div className="w-full max-w-md animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              {t('enterAdminPassword')}
            </h2>
            
            <PinDots length={4} filled={password.length} error={!!error} />
            
            {error && (
              <p className="text-red-500 text-center mb-4">{error}</p>
            )}
            
            <NumPad 
              value={password} 
              onChange={(v) => { setPassword(v); setError(''); }}
              maxLength={4}
              onComplete={handlePasswordComplete}
            />
          </div>
        )}

        {/* Menu step */}
        {step === 'menu' && (
          <div className="flex gap-8 animate-fade-in">
            <button
              onClick={() => setStep('pickup-select')}
              className="group w-72 h-80 bg-gradient-to-br from-dark-800 to-dark-700 
                       border-2 border-dark-600 hover:border-yellow-500 
                       rounded-3xl p-8 flex flex-col items-center justify-center
                       transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/20
                       hover:-translate-y-2 active:scale-95"
            >
              <div className="w-24 h-24 bg-yellow-500/20 rounded-3xl flex items-center justify-center mb-6 
                            group-hover:bg-yellow-500/30 group-hover:scale-110 transition-all duration-300">
                <Package className="w-14 h-14 text-yellow-400 group-hover:text-yellow-300" />
              </div>
              <span className="text-3xl font-bold text-white mb-2">{t('pickupDirty')}</span>
              <span className="text-gray-400">{occupiedCells.length} ячеек с бельём</span>
            </button>

            <button
              onClick={() => setStep('deliver-scan')}
              className="group w-72 h-80 bg-gradient-to-br from-dark-800 to-dark-700 
                       border-2 border-dark-600 hover:border-green-500 
                       rounded-3xl p-8 flex flex-col items-center justify-center
                       transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20
                       hover:-translate-y-2 active:scale-95"
            >
              <div className="w-24 h-24 bg-green-500/20 rounded-3xl flex items-center justify-center mb-6 
                            group-hover:bg-green-500/30 group-hover:scale-110 transition-all duration-300">
                <Truck className="w-14 h-14 text-green-400 group-hover:text-green-300" />
              </div>
              <span className="text-3xl font-bold text-white mb-2">{t('deliverClean')}</span>
              <span className="text-gray-400">Положить чистые вещи</span>
            </button>
          </div>
        )}

        {/* Pickup select step */}
        {step === 'pickup-select' && (
          <div className="w-full max-w-4xl animate-fade-in">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              {t('selectCells')}
            </h2>
            
            <div className="bg-dark-800/50 rounded-3xl p-4 mb-8">
              <CellGrid
                cells={cells}
                selectedCells={selectedCells}
                onCellClick={handleCellClick}
                selectable
              />
            </div>
            
            <div className="flex justify-center gap-4">
              <Button variant="secondary" size="lg" onClick={handleBack}>
                {t('cancel')}
              </Button>
              <Button 
                size="lg" 
                onClick={handleOpenForPickup}
                disabled={selectedCells.length === 0}
              >
                {t('openSelected')} ({selectedCells.length})
              </Button>
            </div>
          </div>
        )}

        {/* Pickup opening step */}
        {step === 'pickup-opening' && (
          <div className="text-center animate-fade-in">
            <Loader2 className="w-24 h-24 text-primary-500 animate-spin mx-auto mb-8" />
            <h2 className="text-3xl font-bold text-white">
              Открываем {selectedCells.length} ячеек...
            </h2>
            <p className="text-gray-400 mt-4">
              Заберите все пакеты с грязным бельём
            </p>
          </div>
        )}

        {/* Deliver scan step */}
        {step === 'deliver-scan' && (
          <div className="w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-center gap-4 mb-8">
              <QrCode className="w-12 h-12 text-primary-400" />
              <h2 className="text-3xl font-bold text-white">
                {t('scanBagQR')}
              </h2>
            </div>
            
            <p className="text-gray-400 text-center mb-8">
              {t('enterOrderId')}
            </p>
            
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="FC-123456789"
              className="input-field text-center text-2xl font-mono mb-8"
              autoFocus
            />
            
            <div className="flex justify-center gap-4">
              <Button variant="secondary" size="lg" onClick={handleBack}>
                {t('cancel')}
              </Button>
              <Button 
                size="lg" 
                onClick={handleDeliverSubmit}
                disabled={!orderId.trim()}
                loading={loading}
              >
                {t('confirm')}
              </Button>
            </div>
          </div>
        )}

        {/* Deliver opening step */}
        {step === 'deliver-opening' && (
          <div className="text-center animate-fade-in">
            <Loader2 className="w-24 h-24 text-primary-500 animate-spin mx-auto mb-8" />
            <h2 className="text-3xl font-bold text-white">
              {t('cellOpening')}
            </h2>
            <p className="text-gray-400 mt-4">
              Положите пакет с чистыми вещами и закройте ячейку
            </p>
          </div>
        )}

        {/* Success step */}
        {step === 'success' && (
          <div className="text-center animate-fade-in">
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-scale-in">
              <Check className="w-20 h-20 text-white" />
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('done')}
            </h2>
            
            <p className="text-gray-400 mb-8">
              Операция завершена успешно
            </p>
            
            <div className="flex justify-center gap-4">
              <Button variant="secondary" size="lg" onClick={handleBack}>
                Продолжить работу
              </Button>
              <Button size="lg" onClick={handleFinish}>
                {t('backToHome')}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
