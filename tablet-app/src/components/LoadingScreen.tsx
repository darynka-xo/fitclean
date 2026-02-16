import { Loader2, Shirt } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Загрузка...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-dark-900 flex flex-col items-center justify-center z-50">
      {/* Animated logo */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-500/30 animate-pulse">
          <Shirt className="w-14 h-14 text-white" />
        </div>
        
        {/* Orbiting loader */}
        <div className="absolute -inset-4 rounded-full border-2 border-primary-500/30 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary-500 rounded-full" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-white mb-4">FitClean</h1>
      
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{message}</span>
      </div>
    </div>
  )
}
