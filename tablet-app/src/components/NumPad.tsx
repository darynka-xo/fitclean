import { Delete } from 'lucide-react'

interface NumPadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  onComplete?: (value: string) => void
}

export function NumPad({ value, onChange, maxLength = 6, onComplete }: NumPadProps) {
  const handlePress = (digit: string) => {
    if (value.length < maxLength) {
      const newValue = value + digit
      onChange(newValue)
      if (newValue.length === maxLength && onComplete) {
        onComplete(newValue)
      }
    }
  }

  const handleDelete = () => {
    onChange(value.slice(0, -1))
  }

  const handleClear = () => {
    onChange('')
  }

  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL']

  return (
    <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
      {buttons.map((btn) => (
        <button
          key={btn}
          onClick={() => {
            if (btn === 'DEL') handleDelete()
            else if (btn === 'C') handleClear()
            else handlePress(btn)
          }}
          className="numpad-btn"
        >
          {btn === 'DEL' ? (
            <Delete className="w-8 h-8" />
          ) : btn === 'C' ? (
            <span className="text-2xl text-gray-500">C</span>
          ) : (
            btn
          )}
        </button>
      ))}
    </div>
  )
}

interface PinDotsProps {
  length: number
  filled: number
  error?: boolean
}

export function PinDots({ length, filled, error }: PinDotsProps) {
  return (
    <div className="flex gap-4 justify-center mb-8">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`w-5 h-5 rounded-full transition-all duration-200 ${
            i < filled
              ? error
                ? 'bg-red-500 scale-110'
                : 'bg-primary-500 scale-110'
              : 'bg-dark-600 border-2 border-dark-500'
          }`}
        />
      ))}
    </div>
  )
}
