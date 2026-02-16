/**
 * KZ004 Locker Controller
 * 
 * Handles communication with locker hardware via RS232/MDB-232
 * Based on KZ004 Driver API Interface Document
 */

import { EventEmitter } from 'events'
import { SerialPort } from 'serialport'
import { InterByteTimeoutParser } from '@serialport/parser-inter-byte-timeout'

// Protocol constants from KZ004 documentation
const FRAME_HEADER = 0xAA
const FRAME_TAIL = 0x55
const BROADCAST_ADDR = 0xFF

// Command codes
const CMD = {
  QUERY_STATUS: 0x01,
  OPEN_CELL: 0x02,
  QUERY_CELL: 0x03,
  CONTROL_LED: 0x04,
  SET_ADDRESS: 0x05,
  QUERY_ALL_CELLS: 0x10,
  QUERY_DOOR_STATUS: 0x11,
  CONTROL_RELAY: 0x12,
  QUERY_WEIGHT: 0x20,
  QUERY_PRESENCE: 0x21,
}

// Cell sizes based on configuration
const CELL_SIZES = {
  1: 'S', 2: 'S', 3: 'M', 4: 'M',
  5: 'M', 6: 'M', 7: 'L', 8: 'L',
  9: 'L', 10: 'L', 11: 'XL', 12: 'XL',
  13: 'XL', 14: 'XL', 15: 'XL', 16: 'XL',
}

export class LockerController extends EventEmitter {
  constructor(portPath, options = {}) {
    super()
    
    this.portPath = portPath
    this.baudRate = options.baudRate || 9600
    this.address = options.address || 0x01
    
    this.port = null
    this.parser = null
    this.connected = false
    this.cells = new Map()
    this.pendingCommands = new Map()
    this.commandId = 0
    
    // Initialize cells
    for (let i = 1; i <= 16; i++) {
      this.cells.set(`cell-${i}`, {
        id: `cell-${i}`,
        number: i,
        size: CELL_SIZES[i] || 'M',
        status: 'available',
        doorOpen: false,
        hasItems: false,
        weight: 0,
      })
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.port = new SerialPort({
          path: this.portPath,
          baudRate: this.baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        })

        this.parser = this.port.pipe(new InterByteTimeoutParser({
          interval: 100,
        }))

        this.port.on('open', async () => {
          console.log(`Serial port ${this.portPath} opened`)
          this.connected = true
          
          // Initial status query
          await this.queryAllCells()
          
          // Start polling door status
          this.startDoorPolling()
          
          resolve()
        })

        this.port.on('error', (err) => {
          console.error('Serial port error:', err)
          if (!this.connected) {
            reject(err)
          }
        })

        this.parser.on('data', (data) => {
          this.handleResponse(data)
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  async disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }
    
    if (this.port && this.port.isOpen) {
      return new Promise((resolve) => {
        this.port.close(() => {
          this.connected = false
          resolve()
        })
      })
    }
  }

  // Build command frame according to protocol
  buildFrame(cmd, data = []) {
    const dataLen = data.length
    const frame = [
      FRAME_HEADER,
      this.address,
      dataLen + 1, // length includes command byte
      cmd,
      ...data,
    ]
    
    // Calculate checksum (XOR of all bytes except header)
    let checksum = 0
    for (let i = 1; i < frame.length; i++) {
      checksum ^= frame[i]
    }
    
    frame.push(checksum)
    frame.push(FRAME_TAIL)
    
    return Buffer.from(frame)
  }

  // Send command and wait for response
  async sendCommand(cmd, data = [], timeout = 5000) {
    return new Promise((resolve, reject) => {
      const cmdId = ++this.commandId
      const frame = this.buildFrame(cmd, data)
      
      const timer = setTimeout(() => {
        this.pendingCommands.delete(cmdId)
        reject(new Error('Command timeout'))
      }, timeout)
      
      this.pendingCommands.set(cmdId, { resolve, reject, timer, cmd })
      
      this.port.write(frame, (err) => {
        if (err) {
          clearTimeout(timer)
          this.pendingCommands.delete(cmdId)
          reject(err)
        }
      })
    })
  }

  // Handle response from locker
  handleResponse(data) {
    if (data.length < 5) return
    
    if (data[0] !== FRAME_HEADER || data[data.length - 1] !== FRAME_TAIL) {
      console.warn('Invalid frame received')
      return
    }
    
    const addr = data[1]
    const len = data[2]
    const cmd = data[3]
    const payload = data.slice(4, 4 + len - 1)
    
    // Find matching pending command
    for (const [cmdId, pending] of this.pendingCommands) {
      if (pending.cmd === cmd) {
        clearTimeout(pending.timer)
        this.pendingCommands.delete(cmdId)
        pending.resolve({ cmd, payload })
        break
      }
    }
    
    // Handle door status updates
    if (cmd === CMD.QUERY_DOOR_STATUS) {
      this.processDoorStatus(payload)
    }
  }

  // Process door status response
  processDoorStatus(payload) {
    // Each bit represents a door: 0 = closed, 1 = open
    for (let i = 0; i < 16; i++) {
      const byteIndex = Math.floor(i / 8)
      const bitIndex = i % 8
      const doorOpen = (payload[byteIndex] & (1 << bitIndex)) !== 0
      
      const cellId = `cell-${i + 1}`
      const cell = this.cells.get(cellId)
      
      if (cell && cell.doorOpen !== doorOpen) {
        cell.doorOpen = doorOpen
        
        // Emit door event
        this.emit('doorEvent', {
          cellId,
          cellNumber: i + 1,
          doorOpen,
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  // Start polling door status
  startDoorPolling(interval = 500) {
    this.pollInterval = setInterval(async () => {
      try {
        await this.queryDoorStatus()
      } catch (error) {
        console.error('Door polling error:', error)
      }
    }, interval)
  }

  // Query all cells status
  async queryAllCells() {
    try {
      const response = await this.sendCommand(CMD.QUERY_ALL_CELLS)
      // Parse response and update cells
      // Format depends on actual protocol
    } catch (error) {
      console.error('Query all cells error:', error)
    }
  }

  // Query door status
  async queryDoorStatus() {
    try {
      await this.sendCommand(CMD.QUERY_DOOR_STATUS)
    } catch (error) {
      // Silently fail for polling
    }
  }

  // Public API methods

  async getStatus() {
    return {
      connected: this.connected,
      address: this.address,
      firmwareVersion: '1.0.0',
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
    
    const cellNumber = cell.number
    
    try {
      // Send open command
      const response = await this.sendCommand(CMD.OPEN_CELL, [cellNumber])
      
      // Update cell status
      cell.status = 'open'
      cell.doorOpen = true
      
      return {
        success: true,
        cellId,
        cellNumber,
        timeout: 60, // Auto-lock timeout in seconds
      }
    } catch (error) {
      throw new Error(`Failed to open cell: ${error.message}`)
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
      
      return null
    }
    
    return this.openCell(availableCells[0].id, reason)
  }

  async reserveCell(cellId, orderId) {
    const cell = this.cells.get(cellId)
    if (!cell) return false
    
    cell.status = 'reserved'
    cell.orderId = orderId
    return true
  }

  async releaseCell(cellId) {
    const cell = this.cells.get(cellId)
    if (!cell) return false
    
    cell.status = 'available'
    cell.orderId = null
    cell.hasItems = false
    return true
  }

  async setCellLed(cellId, color) {
    const cell = this.cells.get(cellId)
    if (!cell) return false
    
    const colorMap = {
      off: 0x00,
      green: 0x01,
      red: 0x02,
      blue: 0x03,
      blink: 0x04,
    }
    
    try {
      await this.sendCommand(CMD.CONTROL_LED, [cell.number, colorMap[color] || 0])
      return true
    } catch {
      return false
    }
  }

  async getCellWeight(cellId) {
    const cell = this.cells.get(cellId)
    if (!cell) return 0
    
    try {
      const response = await this.sendCommand(CMD.QUERY_WEIGHT, [cell.number])
      // Parse weight from response (format depends on protocol)
      const weight = (response.payload[0] << 8) | response.payload[1]
      cell.weight = weight
      return weight
    } catch {
      return 0
    }
  }
}
