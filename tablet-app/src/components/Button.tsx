import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'lg', loading, icon, children, disabled, ...props }, ref) => {
    const baseStyles = 'font-semibold rounded-2xl transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
    
    const variants = {
      primary: 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-lg shadow-primary-500/25',
      secondary: 'bg-dark-700 hover:bg-dark-600 active:bg-dark-600 text-white border border-dark-600',
      danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-lg shadow-red-500/25',
      ghost: 'bg-transparent hover:bg-dark-700/50 text-gray-300 hover:text-white',
    }

    const sizes = {
      sm: 'py-2 px-4 text-sm',
      md: 'py-3 px-6 text-base',
      lg: 'py-4 px-8 text-lg',
      xl: 'py-6 px-12 text-xl',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
