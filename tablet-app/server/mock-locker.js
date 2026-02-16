/**
 * Mock Locker Controller
 * 
 * Simulates locker behavior for development without hardware
 */

import { EventEmitter } from 'events'

const CELL_SIZES = {
  1: 'S', 2: 'S', 3: 'M', 4: 'M',
  5: 'M', 6: 'M', 7: 'L', 8: 'L',
  9: 'L', 10: 'L', 11: 'XL', 12: 'XL',
  13: 'XL', 14: 'XL', 15: 'XL', 16: 'XL',
}

export class MockLockerController extends EventEmitter {
  constructor() {
    super()
    
    this.connected = false
    this.cells = new Map()
    
    // Initialize cells with random status
    for (let i = 1; i <= 16; i++) {
      this.cells.set(`cell-${i}`, {
        id: `cell-${i}`,
        number: i,
        size: CELL_SIZES[i] || 'M',
        status: Math.random() > 0.3 ? 'available' : 'occupied',
        doorOpen: false,
        hasItems: Math.random() > 0.5,
        weight: Math.floor(Math.random() * 5000),
      })
    }
  }

  async connect() {
    console.log('Mock locker connecting...')
    await this.delay(500)
    this.connected = true
    console.log('Mock locker connected')
  }

  async disconnect() {
    this.connected = false
    console.log('Mock locker disconnected')
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getStatus() {
    return {
      connected: this.connected,
      address: 0x01,
      firmwareVersion: '1.0.0-mock',
      totalCells: this.cells.size,
      cells: Array.from(this.cells.values()),
    }
  }

  async getCells() {
    return Array.from(this.cells.values())
  }

  async getCell(cellId) {
    return this.cells.get(cellId) || null
  }

  async getAvailableCells(size = null) {
    const cells = Array.from(this.cells.values())
      .filter(c => c.status === 'available')
    
    if (size) {
      return cells.filter(c => c.size === size)
    }
    return cells
  }

  async openCell(cellId, reason = 'client') {
    const cell = this.cells.get(cellId)
    if (!cell) {
      throw new Error('Cell not found')
    }
    
    console.log(`[Mock] Opening cell ${cell.number} for ${reason}`)
    
    // Simulate door opening
    await this.delay(300)
    
    cell.status = 'open'
    cell.doorOpen = true
    
    // Emit door open event
    this.emit('doorEvent', {
      cellId,
      cellNumber: cell.number,
      doorOpen: true,
      timestamp: new Date().toISOString(),
    })
    
    // Simulate auto-close after 30 seconds if door is left open
    setTimeout(() => {
      if (cell.doorOpen) {
        this.simulateDoorClose(cellId)
      }
    }, 30000)
    
    return {
      success: true,
      cellId,
      cellNumber: cell.number,
      timeout: 60,
    }
  }

  async openAvailableCell(size = 'M', reason = 'client') {
    const availableCells = await this.getAvailableCells(size)
    
    if (availableCells.length === 0) {
      // Try larger sizes
      const sizeOrder = ['S', 'M', 'L', 'XL']
      const currentIndex = sizeOrder.indexOf(size)
      
      for (let i = currentIndex + 1; i < sizeOrder.length; i++) {
        const cells = await this.getAvailableCells(sizeOrder[i])
        if (cells.length > 0) {
          return this.openCell(cells[0].id, reason)
        }
      }
      
      throw new Error('No available cells')
    }
    
    return this.openCell(availableCells[0].id, reason)
  }

  simulateDoorClose(cellId) {
    const cell = this.cells.get(cellId)
    if (!cell) return
    
    console.log(`[Mock] Door closed for cell ${cell.number}`)
    
    cell.doorOpen = false
    cell.status = 'occupied'
    cell.hasItems = true
    
    // Emit door close event
    this.emit('doorEvent', {
      cellId,
      cellNumber: cell.number,
      doorOpen: false,
      timestamp: new Date().toISOString(),
    })
  }

  async reserveCell(cellId, orderId) {
    const cell = this.cells.get(cellId)
    if (!cell) return false
    
    cell.status = 'reserved'
    cell.orderId = orderId
    console.log(`[Mock] Cell ${cell.number} reserved for order ${orderId}`)
    return true
  }

  async releaseCell(cellId) {
    const cell = this.cells.get(cellId)
    if (!cell) return false
    
    cell.status = 'available'
    cell.orderId = null
    cell.hasItems = false
    console.log(`[Mock] Cell ${cell.number} released`)
    return true
  }

  async setCellLed(cellId, color) {
    const cell = this.cells.get(cellId)
    if (!cell) return false
    
    console.log(`[Mock] Cell ${cell.number} LED set to ${color}`)
    return true
  }

  async getCellWeight(cellId) {
    const cell = this.cells.get(cellId)
    if (!cell) return 0
    
    // Return random weight for simulation
    const weight = cell.hasItems ? Math.floor(Math.random() * 5000) + 500 : 0
    cell.weight = weight
    return weight
  }
}
