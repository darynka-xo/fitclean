import { useState, useEffect } from 'react'
import { Phone } from 'lucide-react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
  autoFocus?: boolean
}

export function PhoneInput({ value, onChange, onSubmit, disabled, autoFocus }: PhoneInputProps) {
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!value) {
      onChange('+7')
    }
  }, [value, onChange])

  const formatPhone = (input: string): string => {
    // Remove all non-digits except +
    const cleaned = input.replace(/[^\d+]/g, '')
    
    // Ensure it starts with +7
    if (!cleaned.startsWith('+7')) {
      if (cleaned.startsWith('7')) {
        return '+' + cleaned
      } else if (cleaned.startsWith('8')) {
        return '+7' + cleaned.slice(1)
      } else if (cleaned.startsWith('+')) {
        return '+7' + cleaned.slice(1).replace(/\D/g, '')
      }
      return '+7' + cleaned.replace(/\D/g, '')
    }
    
    // Format: +7 (XXX) XXX-XX-XX
    const digits = cleaned.slice(2)
    if (digits.length === 0) return '+7'
    if (digits.length <= 3) return `+7 (${digits}`
    if (digits.length <= 6) return `+7 (${digits.slice(0, 3)}) ${digits.slice(3)}`
    if (digits.length <= 8) return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    // Only allow up to full phone length
    if (formatted.replace(/\D/g, '').length <= 11) {
      onChange(formatted)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit()
    }
  }

  const isComplete = value.replace(/\D/g, '').length === 11

  return (
    <div className={`
      relative flex items-center gap-4 
      bg-dark-700 border-2 rounded-2xl py-4 px-6
      transition-all duration-200
      ${focused ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-dark-600'}
      ${isComplete ? 'border-green-500/50' : ''}
    `}>
      <Phone className={`w-6 h-6 ${focused ? 'text-primary-500' : 'text-gray-500'}`} />
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder="+7 (___) ___-__-__"
        className="
          flex-1 bg-transparent text-2xl text-white
          placeholder-gray-600 outline-none
          tracking-wider font-mono
        "
      />
      {isComplete && (
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <span className="text-white text-sm">✓</span>
        </div>
      )}
    </div>
  )
}
