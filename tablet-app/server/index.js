/**
 * Local Locker Server
 * 
 * Runs on the Android tablet to communicate with KZ004 locker
 * via RS232/MDB-232 serial connection
 * 
 * This server:
 * 1. Opens serial port to locker hardware
 * 2. Provides HTTP API for the web app
 * 3. Handles real-time door events via SSE
 */

import http from 'http'
import { URL } from 'url'
import { LockerController } from './locker-controller.js'
import { MockLockerController } from './mock-locker.js'

const PORT = process.env.LOCKER_PORT || 8080
const SERIAL_PORT = process.env.SERIAL_PORT || '/dev/ttyUSB0'
const USE_MOCK = process.env.USE_MOCK === 'true'

// Initialize locker controller
const locker = USE_MOCK 
  ? new MockLockerController()
  : new LockerController(SERIAL_PORT)

// SSE clients for door events
const sseClients = new Set()

// Broadcast door event to all SSE clients
function broadcastDoorEvent(event) {
  const data = JSON.stringify(event)
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`)
  }
}

// Subscribe to locker door events
locker.on('doorEvent', broadcastDoorEvent)

// Parse JSON body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

// Send JSON response
function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(data))
}

// Send error response
function sendError(res, message, status = 500) {
  sendJson(res, { error: true, message }, status)
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method

  try {
    // GET /api/locker/status - Get locker status
    if (path === '/api/locker/status' && method === 'GET') {
      const status = await locker.getStatus()
      sendJson(res, status)
      return
    }

    // GET /api/locker/cells - Get all cells
    if (path === '/api/locker/cells' && method === 'GET') {
      const cells = await locker.getCells()
      sendJson(res, cells)
      return
    }

    // GET /api/locker/cells/available - Get available cells
    if (path === '/api/locker/cells/available' && method === 'GET') {
      const size = url.searchParams.get('size')
      const cells = await locker.getAvailableCells(size)
      sendJson(res, cells)
      return
    }

    // GET /api/locker/cells/:id - Get specific cell
    const cellMatch = path.match(/^\/api\/locker\/cells\/([^/]+)$/)
    if (cellMatch && method === 'GET') {
      const cellId = cellMatch[1]
      const cell = await locker.getCell(cellId)
      if (cell) {
        sendJson(res, cell)
      } else {
        sendError(res, 'Cell not found', 404)
      }
      return
    }

    // POST /api/locker/cells/:id/open - Open specific cell
    const openMatch = path.match(/^\/api\/locker\/cells\/([^/]+)\/open$/)
    if (openMatch && method === 'POST') {
      const cellId = openMatch[1]
      const body = await parseBody(req)
      const result = await locker.openCell(cellId, body.reason || 'client')
      sendJson(res, result)
      return
    }

    // POST /api/locker/cells/open-available - Open any available cell
    if (path === '/api/locker/cells/open-available' && method === 'POST') {
      const body = await parseBody(req)
      const result = await locker.openAvailableCell(body.size || 'M', body.reason || 'client')
      if (result) {
        sendJson(res, result)
      } else {
        sendError(res, 'No available cells', 404)
      }
      return
    }

    // POST /api/locker/cells/:id/reserve - Reserve cell
    const reserveMatch = path.match(/^\/api\/locker\/cells\/([^/]+)\/reserve$/)
    if (reserveMatch && method === 'POST') {
      const cellId = reserveMatch[1]
      const body = await parseBody(req)
      const success = await locker.reserveCell(cellId, body.orderId)
      sendJson(res, { success })
      return
    }

    // POST /api/locker/cells/:id/release - Release cell
    const releaseMatch = path.match(/^\/api\/locker\/cells\/([^/]+)\/release$/)
    if (releaseMatch && method === 'POST') {
      const cellId = releaseMatch[1]
      const success = await locker.releaseCell(cellId)
      sendJson(res, { success })
      return
    }

    // POST /api/locker/cells/:id/led - Control LED
    const ledMatch = path.match(/^\/api\/locker\/cells\/([^/]+)\/led$/)
    if (ledMatch && method === 'POST') {
      const cellId = ledMatch[1]
      const body = await parseBody(req)
      const success = await locker.setCellLed(cellId, body.color)
      sendJson(res, { success })
      return
    }

    // GET /api/locker/cells/:id/weight - Get cell weight
    const weightMatch = path.match(/^\/api\/locker\/cells\/([^/]+)\/weight$/)
    if (weightMatch && method === 'GET') {
      const cellId = weightMatch[1]
      const weight = await locker.getCellWeight(cellId)
      sendJson(res, { weight })
      return
    }

    // GET /api/locker/events - SSE for door events
    if (path === '/api/locker/events' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      })
      
      res.write(':ok\n\n')
      sseClients.add(res)
      
      req.on('close', () => {
        sseClients.delete(res)
      })
      return
    }

    // 404 for unknown routes
    sendError(res, 'Not found', 404)

  } catch (error) {
    console.error('Server error:', error)
    sendError(res, error.message || 'Internal server error', 500)
  }
})

// Start server
async function start() {
  try {
    await locker.connect()
    console.log(`✓ Locker connected ${USE_MOCK ? '(mock mode)' : `via ${SERIAL_PORT}`}`)
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Locker API server running on http://0.0.0.0:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await locker.disconnect()
  server.close()
  process.exit(0)
})

start()
