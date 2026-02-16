import { Package, Lock, Unlock, AlertCircle } from 'lucide-react'
import type { Cell } from '../store/appStore'

interface CellGridProps {
  cells: Cell[]
  selectedCells?: string[]
  onCellClick?: (cell: Cell) => void
  selectable?: boolean
  highlightCell?: string
}

export function CellGrid({ 
  cells, 
  selectedCells = [], 
  onCellClick, 
  selectable = false,
  highlightCell 
}: CellGridProps) {
  const getSizeClass = (size: Cell['size']) => {
    switch (size) {
      case 'S': return 'col-span-1 row-span-1'
      case 'M': return 'col-span-1 row-span-2'
      case 'L': return 'col-span-2 row-span-2'
      case 'XL': return 'col-span-2 row-span-3'
      default: return 'col-span-1 row-span-1'
    }
  }

  const getStatusStyles = (cell: Cell, isSelected: boolean, isHighlighted: boolean) => {
    if (isHighlighted) {
      return 'bg-primary-500/30 border-primary-400 shadow-lg shadow-primary-500/30 animate-pulse'
    }
    if (isSelected) {
      return 'bg-primary-500/20 border-primary-500 ring-2 ring-primary-500/50'
    }
    switch (cell.status) {
      case 'available':
        return 'bg-dark-700/50 border-dark-600 hover:bg-dark-600/50 cursor-pointer'
      case 'occupied':
        return 'bg-yellow-500/10 border-yellow-500/50'
      case 'reserved':
        return 'bg-blue-500/10 border-blue-500/50'
      case 'open':
        return 'bg-primary-500/20 border-primary-500 cell-open'
      case 'error':
        return 'bg-red-500/10 border-red-500/50'
      default:
        return 'bg-dark-700/50 border-dark-600'
    }
  }

  const getStatusIcon = (status: Cell['status']) => {
    switch (status) {
      case 'available':
        return <Unlock className="w-6 h-6 text-green-400" />
      case 'occupied':
        return <Package className="w-6 h-6 text-yellow-400" />
      case 'reserved':
        return <Lock className="w-6 h-6 text-blue-400" />
      case 'open':
        return <Unlock className="w-6 h-6 text-primary-400" />
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-400" />
      default:
        return null
    }
  }

  return (
    <div className="grid grid-cols-4 gap-3 p-4">
      {cells.map((cell) => {
        const isSelected = selectedCells.includes(cell.id)
        const isHighlighted = highlightCell === cell.id
        const isClickable = selectable && (cell.status === 'available' || cell.status === 'occupied')

        return (
          <div
            key={cell.id}
            onClick={() => isClickable && onCellClick?.(cell)}
            className={`
              ${getSizeClass(cell.size)}
              ${getStatusStyles(cell, isSelected, isHighlighted)}
              border-2 rounded-xl p-3 transition-all duration-300
              flex flex-col items-center justify-center min-h-[100px]
              ${isClickable ? 'cursor-pointer active:scale-95' : ''}
            `}
          >
            <span className="text-2xl font-bold text-white mb-2">
              {cell.number}
            </span>
            {getStatusIcon(cell.status)}
            <span className="text-xs text-gray-400 mt-1">
              {cell.size}
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface SingleCellProps {
  cell: Cell
  isOpen?: boolean
  size?: 'md' | 'lg'
}

export function SingleCell({ cell, isOpen, size = 'lg' }: SingleCellProps) {
  const sizeClasses = size === 'lg' ? 'w-48 h-48' : 'w-32 h-32'
  
  return (
    <div 
      className={`
        ${sizeClasses}
        ${isOpen ? 'bg-primary-500/30 border-primary-400 cell-open glow-pulse' : 'bg-dark-700 border-dark-600'}
        border-4 rounded-3xl flex flex-col items-center justify-center
        transition-all duration-500
      `}
    >
      <span className="text-6xl font-bold text-white mb-2">
        {cell.number}
      </span>
      <span className="text-lg text-gray-300">
        {isOpen ? 'Открыта' : `Размер ${cell.size}`}
      </span>
    </div>
  )
}
