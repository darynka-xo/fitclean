/**
 * KZ004 Driver API Client
 * 
 * Communicates with local server that handles RS232/MDB-232 protocol
 * Based on KZ004 Driver API Interface Document
 */

const API_BASE = '/api/locker'

// Command codes from KZ004 documentation
export enum LockerCommand {
  // Basic commands
  QUERY_STATUS = 0x01,
  OPEN_CELL = 0x02,
  QUERY_CELL = 0x03,
  CONTROL_LED = 0x04,
  SET_ADDRESS = 0x05,
  
  // Extended commands
  QUERY_ALL_CELLS = 0x10,
  QUERY_DOOR_STATUS = 0x11,
  CONTROL_RELAY = 0x12,
  
  // Sensor commands
  QUERY_WEIGHT = 0x20,
  QUERY_PRESENCE = 0x21,
}

export interface LockerStatus {
  connected: boolean
  address: number
  firmwareVersion: string
  totalCells: number
  cells: CellInfo[]
}

export interface CellInfo {
  id: string
  number: number
  size: 'S' | 'M' | 'L' | 'XL'
  status: 'available' | 'occupied' | 'reserved' | 'open' | 'error'
  doorOpen: boolean
  hasItems: boolean
  weight?: number // in grams
}

export interface OpenCellResult {
  success: boolean
  cellId: string
  cellNumber: number
  timeout: number // seconds until auto-lock
  error?: string
}

export interface DoorEvent {
  cellId: string
  cellNumber: number
  doorOpen: boolean
  timestamp: string
}

class LockerApiClient {
  private eventSource: EventSource | null = null
  private onDoorEventCallback: ((event: DoorEvent) => void) | null = null

  /**
   * Get locker status and all cells info
   */
  async getStatus(): Promise<LockerStatus> {
    const response = await fetch(`${API_BASE}/status`)
    if (!response.ok) {
      throw new Error('Failed to get locker status')
    }
    return response.json()
  }

  /**
   * Get all cells status
   */
  async getCells(): Promise<CellInfo[]> {
    const response = await fetch(`${API_BASE}/cells`)
    if (!response.ok) {
      throw new Error('Failed to get cells')
    }
    return response.json()
  }

  /**
   * Get specific cell info
   */
  async getCell(cellId: string): Promise<CellInfo> {
    const response = await fetch(`${API_BASE}/cells/${cellId}`)
    if (!response.ok) {
      throw new Error(`Failed to get cell ${cellId}`)
    }
    return response.json()
  }

  /**
   * Find available cells by size
   */
  async findAvailableCells(size?: CellInfo['size']): Promise<CellInfo[]> {
    const params = size ? `?size=${size}` : ''
    const response = await fetch(`${API_BASE}/cells/available${params}`)
    if (!response.ok) {
      throw new Error('Failed to find available cells')
    }
    return response.json()
  }

  /**
   * Open a specific cell
   */
  async openCell(cellId: string, reason: string = 'client'): Promise<OpenCellResult> {
    const response = await fetch(`${API_BASE}/cells/${cellId}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to open cell')
    }
    return response.json()
  }

  /**
   * Open any available cell of specified size
   */
  async openAvailableCell(size: CellInfo['size'] = 'M', reason: string = 'client'): Promise<OpenCellResult> {
    const response = await fetch(`${API_BASE}/cells/open-available`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size, reason }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'No available cells')
    }
    return response.json()
  }

  /**
   * Reserve a cell for specific order
   */
  async reserveCell(cellId: string, orderId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/cells/${cellId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
    return response.ok
  }

  /**
   * Release a reserved cell
   */
  async releaseCell(cellId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/cells/${cellId}/release`, {
      method: 'POST',
    })
    return response.ok
  }

  /**
   * Check if door is closed
   */
  async isDoorClosed(cellId: string): Promise<boolean> {
    const cell = await this.getCell(cellId)
    return !cell.doorOpen
  }

  /**
   * Wait for door to close with polling
   */
  async waitForDoorClose(
    cellId: string,
    timeoutMs: number = 60000,
    pollIntervalMs: number = 500
  ): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const isClosed = await this.isDoorClosed(cellId)
      if (isClosed) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
    
    return false
  }

  /**
   * Subscribe to door events via Server-Sent Events
   */
  subscribeToDoorEvents(callback: (event: DoorEvent) => void): void {
    this.onDoorEventCallback = callback
    
    if (this.eventSource) {
      this.eventSource.close()
    }

    this.eventSource = new EventSource(`${API_BASE}/events`)
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DoorEvent
        if (this.onDoorEventCallback) {
          this.onDoorEventCallback(data)
        }
      } catch (e) {
        console.error('Failed to parse door event:', e)
      }
    }

    this.eventSource.onerror = () => {
      console.error('Door events connection lost, reconnecting...')
      setTimeout(() => this.subscribeToDoorEvents(callback), 3000)
    }
  }

  /**
   * Unsubscribe from door events
   */
  unsubscribeDoorEvents(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.onDoorEventCallback = null
  }

  /**
   * Control cell LED
   */
  async setCellLed(cellId: string, color: 'off' | 'green' | 'red' | 'blue' | 'blink'): Promise<boolean> {
    const response = await fetch(`${API_BASE}/cells/${cellId}/led`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    })
    return response.ok
  }

  /**
   * Get cell weight from sensor
   */
  async getCellWeight(cellId: string): Promise<number> {
    const response = await fetch(`${API_BASE}/cells/${cellId}/weight`)
    if (!response.ok) {
      throw new Error('Failed to get cell weight')
    }
    const data = await response.json()
    return data.weight
  }
}

export const lockerApi = new LockerApiClient()
