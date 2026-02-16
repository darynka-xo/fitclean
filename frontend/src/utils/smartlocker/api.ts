/**
 * Smart Locker API Integration
 * API Documentation: https://smartlocker-api-aituoiot.apifox.cn/
 */

const SMARTLOCKER_API_BASE = process.env.NEXT_PUBLIC_SMARTLOCKER_API_URL || 'https://smartlocker-api-aituoiot.apifox.cn';
const SMARTLOCKER_API_KEY = process.env.NEXT_PUBLIC_SMARTLOCKER_API_KEY || '';

export interface LockerCell {
  cell_id: string;
  cell_number: number;
  cell_size: 'small' | 'medium' | 'large' | 'xl';
  status: 'available' | 'occupied' | 'reserved' | 'error';
  sensor_data?: {
    weight?: number; // grams
    presence?: boolean;
    door_open?: boolean;
    last_updated?: string;
  };
}

export interface LockerDevice {
  device_id: string;
  device_name: string;
  location: string;
  cells: LockerCell[];
  online: boolean;
}

export interface OpenCellRequest {
  device_id: string;
  cell_id: string;
  reason?: 'client_dropoff' | 'client_pickup' | 'courier_pickup' | 'courier_delivery' | 'maintenance';
}

export interface OpenCellResponse {
  success: boolean;
  cell_id: string;
  opened_at: string;
  timeout_seconds?: number;
}

export interface CellSensorData {
  cell_id: string;
  weight: number;
  presence: boolean;
  door_open: boolean;
  temperature?: number;
  humidity?: number;
  timestamp: string;
}

/**
 * Get all locker devices
 */
export async function getLockerDevices(): Promise<LockerDevice[]> {
  try {
    const response = await fetch(`${SMARTLOCKER_API_BASE}/devices`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SMARTLOCKER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch devices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.devices || [];
  } catch (error) {
    console.error('Error fetching locker devices:', error);
    throw error;
  }
}

/**
 * Get specific locker device with cells
 */
export async function getLockerDevice(deviceId: string): Promise<LockerDevice> {
  try {
    const response = await fetch(`${SMARTLOCKER_API_BASE}/devices/${deviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SMARTLOCKER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch device: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching locker device:', error);
    throw error;
  }
}

/**
 * Get available cells for a specific size
 */
export async function getAvailableCells(
  deviceId: string,
  size?: LockerCell['cell_size']
): Promise<LockerCell[]> {
  try {
    const device = await getLockerDevice(deviceId);
    let cells = device.cells.filter(cell => cell.status === 'available');

    if (size) {
      cells = cells.filter(cell => cell.cell_size === size);
    }

    return cells;
  } catch (error) {
    console.error('Error getting available cells:', error);
    throw error;
  }
}

/**
 * Open a specific cell
 */
export async function openCell(request: OpenCellRequest): Promise<OpenCellResponse> {
  try {
    const response = await fetch(`${SMARTLOCKER_API_BASE}/devices/${request.device_id}/cells/${request.cell_id}/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SMARTLOCKER_API_KEY}`,
      },
      body: JSON.stringify({
        reason: request.reason || 'client_dropoff',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to open cell: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error opening cell:', error);
    throw error;
  }
}

/**
 * Get sensor data for a cell
 */
export async function getCellSensorData(
  deviceId: string,
  cellId: string
): Promise<CellSensorData> {
  try {
    const response = await fetch(
      `${SMARTLOCKER_API_BASE}/devices/${deviceId}/cells/${cellId}/sensors`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SMARTLOCKER_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get sensor data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting sensor data:', error);
    throw error;
  }
}

/**
 * Monitor cell door state (polling or webhook)
 * Returns true if door is closed
 */
export async function checkCellDoorClosed(
  deviceId: string,
  cellId: string
): Promise<boolean> {
  try {
    const sensorData = await getCellSensorData(deviceId, cellId);
    return !sensorData.door_open;
  } catch (error) {
    console.error('Error checking door state:', error);
    return false;
  }
}

/**
 * Get cell status
 */
export async function getCellStatus(
  deviceId: string,
  cellId: string
): Promise<LockerCell['status']> {
  try {
    const device = await getLockerDevice(deviceId);
    const cell = device.cells.find(c => c.cell_id === cellId);
    return cell?.status || 'error';
  } catch (error) {
    console.error('Error getting cell status:', error);
    return 'error';
  }
}

/**
 * Reserve a cell (mark as reserved before opening)
 */
export async function reserveCell(
  deviceId: string,
  cellId: string,
  orderId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${SMARTLOCKER_API_BASE}/devices/${deviceId}/cells/${cellId}/reserve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SMARTLOCKER_API_KEY}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          reserved_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error reserving cell:', error);
    return false;
  }
}

/**
 * Release a cell (mark as available)
 */
export async function releaseCell(
  deviceId: string,
  cellId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${SMARTLOCKER_API_BASE}/devices/${deviceId}/cells/${cellId}/release`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SMARTLOCKER_API_KEY}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error releasing cell:', error);
    return false;
  }
}

/**
 * Wait for cell door to close (with timeout)
 */
export async function waitForDoorClose(
  deviceId: string,
  cellId: string,
  timeoutMs: number = 30000,
  pollIntervalMs: number = 500
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const isClosed = await checkCellDoorClosed(deviceId, cellId);
    if (isClosed) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}

/**
 * Auto-select and open appropriate cell size
 */
export async function autoOpenCell(
  deviceId: string,
  size: LockerCell['cell_size'] = 'medium',
  reason: OpenCellRequest['reason'] = 'client_dropoff'
): Promise<{ cell_id: string; opened_at: string } | null> {
  try {
    // Get available cells of requested size
    let availableCells = await getAvailableCells(deviceId, size);

    // If no cells of exact size, try larger sizes
    if (availableCells.length === 0) {
      const sizeOrder: LockerCell['cell_size'][] = ['small', 'medium', 'large', 'xl'];
      const currentIndex = sizeOrder.indexOf(size);
      
      for (let i = currentIndex + 1; i < sizeOrder.length; i++) {
        availableCells = await getAvailableCells(deviceId, sizeOrder[i]);
        if (availableCells.length > 0) break;
      }
    }

    if (availableCells.length === 0) {
      throw new Error('No available cells');
    }

    // Select first available cell
    const selectedCell = availableCells[0];

    // Open the cell
    const result = await openCell({
      device_id: deviceId,
      cell_id: selectedCell.cell_id,
      reason,
    });

    return {
      cell_id: selectedCell.cell_id,
      opened_at: result.opened_at,
    };
  } catch (error) {
    console.error('Error auto-opening cell:', error);
    return null;
  }
}

