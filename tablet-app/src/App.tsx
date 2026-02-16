import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import HomePage from './pages/HomePage'
import DropoffPage from './pages/DropoffPage'
import PickupPage from './pages/PickupPage'
import CourierPage from './pages/CourierPage'
import { useAppStore } from './store/appStore'

function App() {
  const { initializeApp, connectionStatus } = useAppStore()

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  return (
    <div className="h-full w-full relative">
      {/* Connection status indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <div 
          className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' 
              ? 'bg-green-500 animate-pulse' 
              : connectionStatus === 'connecting' 
              ? 'bg-yellow-500 animate-pulse' 
              : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-gray-400">
          {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
        </span>
      </div>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dropoff/*" element={<DropoffPage />} />
        <Route path="/pickup/*" element={<PickupPage />} />
        <Route path="/courier/*" element={<CourierPage />} />
      </Routes>
    </div>
  )
}

export default App
