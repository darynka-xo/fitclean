import { create } from 'zustand'

export type Language = 'ru' | 'kk' | 'en'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface User {
  id: string
  phone: string
  name?: string
  email?: string
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  status: 'pending' | 'paid' | 'in_locker' | 'picked_up' | 'in_laundry' | 'ready' | 'completed'
  cellId?: string
  createdAt: string
}

export interface Cell {
  id: string
  number: number
  size: 'S' | 'M' | 'L' | 'XL'
  status: 'available' | 'occupied' | 'reserved' | 'open' | 'error'
  orderId?: string
}

interface AppState {
  // Language
  language: Language
  setLanguage: (lang: Language) => void

  // Connection
  connectionStatus: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void

  // User
  currentUser: User | null
  setCurrentUser: (user: User | null) => void

  // Orders
  currentOrder: Order | null
  setCurrentOrder: (order: Order | null) => void

  // Cells
  cells: Cell[]
  setCells: (cells: Cell[]) => void
  updateCell: (cellId: string, update: Partial<Cell>) => void

  // Locker
  openCellId: string | null
  setOpenCellId: (cellId: string | null) => void

  // Payment
  paymentStatus: 'idle' | 'pending' | 'success' | 'failed'
  setPaymentStatus: (status: 'idle' | 'pending' | 'success' | 'failed') => void

  // App initialization
  initializeApp: () => Promise<void>
  
  // Reset
  reset: () => void
}

const initialState = {
  language: 'ru' as Language,
  connectionStatus: 'disconnected' as ConnectionStatus,
  currentUser: null,
  currentOrder: null,
  cells: [],
  openCellId: null,
  paymentStatus: 'idle' as const,
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setLanguage: (language) => {
    set({ language })
    localStorage.setItem('fitclean_language', language)
  },

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setCurrentUser: (currentUser) => set({ currentUser }),

  setCurrentOrder: (currentOrder) => set({ currentOrder }),

  setCells: (cells) => set({ cells }),

  updateCell: (cellId, update) => {
    const cells = get().cells.map((cell) =>
      cell.id === cellId ? { ...cell, ...update } : cell
    )
    set({ cells })
  },

  setOpenCellId: (openCellId) => set({ openCellId }),

  setPaymentStatus: (paymentStatus) => set({ paymentStatus }),

  initializeApp: async () => {
    // Load saved language
    const savedLang = localStorage.getItem('fitclean_language') as Language | null
    if (savedLang) {
      set({ language: savedLang })
    }

    // Connect to local locker server
    set({ connectionStatus: 'connecting' })
    
    try {
      // Try to connect to local locker API
      const response = await fetch('/api/locker/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        const data = await response.json()
        set({ 
          connectionStatus: 'connected',
          cells: data.cells || [],
        })
      } else {
        set({ connectionStatus: 'disconnected' })
      }
    } catch {
      // If local server is not running, use mock data for development
      console.log('Local locker server not available, using mock data')
      set({ 
        connectionStatus: 'connected',
        cells: generateMockCells(),
      })
    }
  },

  reset: () => {
    set({
      currentUser: null,
      currentOrder: null,
      openCellId: null,
      paymentStatus: 'idle',
    })
  },
}))

// Mock cells for development
function generateMockCells(): Cell[] {
  const sizes: Cell['size'][] = ['S', 'M', 'M', 'L', 'L', 'L', 'XL', 'XL']
  return Array.from({ length: 16 }, (_, i) => ({
    id: `cell-${i + 1}`,
    number: i + 1,
    size: sizes[i % sizes.length],
    status: Math.random() > 0.3 ? 'available' : 'occupied',
  }))
}
