/**
 * Kaspi QR API Client
 * 
 * In MOCK mode - payment succeeds instantly
 */

// Check if mock mode is enabled
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || !import.meta.env.VITE_KASPI_MERCHANT_ID

export interface KaspiConfig {
  merchantId: string
  terminalId: string
  apiKey: string
  baseUrl?: string
}

export interface CreatePaymentRequest {
  amount: number
  orderId: string
  description?: string
  returnUrl?: string
}

export interface KaspiPayment {
  qrPaymentId: string
  qrToken: string
  qrLink: string
  qrImageUrl?: string
  status: KaspiPaymentStatus
  amount: number
  orderId: string
  createdAt: string
  expiresAt: string
}

export type KaspiPaymentStatus = 
  | 'WAIT_PAY'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'

export interface PaymentStatusResponse {
  qrPaymentId: string
  status: KaspiPaymentStatus
  amount: number
  commission?: number
  transactionId?: string
  paidAt?: string
}

class KaspiApiClient {
  private config: KaspiConfig | null = null
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  configure(config: KaspiConfig): void {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://kaspi.kz/pay/api/v1',
    }
  }

  /**
   * Create QR payment request
   * In MOCK mode - returns fake payment instantly
   */
  async createPayment(request: CreatePaymentRequest): Promise<KaspiPayment> {
    if (MOCK_MODE) {
      console.log(`💰 [MOCK] Creating payment: ${request.amount} tenge for order ${request.orderId}`)
      
      const mockPayment: KaspiPayment = {
        qrPaymentId: `mock-pay-${Date.now()}`,
        qrToken: 'mock-token',
        qrLink: `https://kaspi.kz/pay/mock?order=${request.orderId}&amount=${request.amount}`,
        status: 'WAIT_PAY',
        amount: request.amount,
        orderId: request.orderId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      }
      
      return mockPayment
    }

    if (!this.config) {
      throw new Error('Kaspi API not configured')
    }

    const response = await fetch('/api/payments/kaspi/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: this.config.merchantId,
        terminalId: this.config.terminalId,
        amount: request.amount,
        orderId: request.orderId,
        description: request.description || `Заказ ${request.orderId}`,
        returnUrl: request.returnUrl,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create payment')
    }

    return response.json()
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(qrPaymentId: string): Promise<PaymentStatusResponse> {
    if (MOCK_MODE) {
      return {
        qrPaymentId,
        status: 'SUCCESS',
        amount: 1500,
        transactionId: `mock-txn-${Date.now()}`,
        paidAt: new Date().toISOString(),
      }
    }

    const response = await fetch(`/api/payments/kaspi/status/${qrPaymentId}`)
    
    if (!response.ok) {
      throw new Error('Failed to get payment status')
    }

    return response.json()
  }

  /**
   * Wait for payment - in MOCK mode succeeds after 2 seconds
   */
  async waitForPayment(
    qrPaymentId: string,
    onStatusChange?: (status: KaspiPaymentStatus) => void,
    _timeoutMs: number = 300000,
    _pollIntervalMs: number = 2000
  ): Promise<PaymentStatusResponse> {
    if (MOCK_MODE) {
      console.log(`💰 [MOCK] Waiting for payment ${qrPaymentId}...`)
      
      // Simulate payment processing
      return new Promise((resolve) => {
        if (onStatusChange) onStatusChange('WAIT_PAY')
        
        setTimeout(() => {
          if (onStatusChange) onStatusChange('PROCESSING')
        }, 1000)
        
        setTimeout(() => {
          console.log(`💰 [MOCK] Payment ${qrPaymentId} SUCCESS!`)
          if (onStatusChange) onStatusChange('SUCCESS')
          
          resolve({
            qrPaymentId,
            status: 'SUCCESS',
            amount: 1500,
            transactionId: `mock-txn-${Date.now()}`,
            paidAt: new Date().toISOString(),
          })
        }, 2000)
      })
    }

    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          if (Date.now() - startTime > _timeoutMs) {
            this.stopPolling(qrPaymentId)
            reject(new Error('Payment timeout'))
            return
          }

          const status = await this.getPaymentStatus(qrPaymentId)
          
          if (onStatusChange) {
            onStatusChange(status.status)
          }

          if (status.status === 'SUCCESS') {
            this.stopPolling(qrPaymentId)
            resolve(status)
          } else if (status.status === 'FAILED' || status.status === 'CANCELLED' || status.status === 'EXPIRED') {
            this.stopPolling(qrPaymentId)
            reject(new Error(`Payment ${status.status.toLowerCase()}`))
          }
        } catch (error) {
          console.error('Payment poll error:', error)
        }
      }

      poll()
      const intervalId = setInterval(poll, _pollIntervalMs)
      this.pollingIntervals.set(qrPaymentId, intervalId)
    })
  }

  stopPolling(qrPaymentId: string): void {
    const intervalId = this.pollingIntervals.get(qrPaymentId)
    if (intervalId) {
      clearInterval(intervalId)
      this.pollingIntervals.delete(qrPaymentId)
    }
  }

  async cancelPayment(qrPaymentId: string): Promise<boolean> {
    this.stopPolling(qrPaymentId)
    
    if (MOCK_MODE) {
      console.log(`💰 [MOCK] Payment ${qrPaymentId} cancelled`)
      return true
    }
    
    const response = await fetch(`/api/payments/kaspi/cancel/${qrPaymentId}`, {
      method: 'POST',
    })
    
    return response.ok
  }

  /**
   * Generate QR code image
   */
  async generateQRImage(qrLink: string): Promise<string> {
    const QRCode = await import('qrcode')
    return QRCode.toDataURL(qrLink, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
  }
}

export const kaspiApi = new KaspiApiClient()

// Initialize if credentials provided
if (typeof window !== 'undefined') {
  const config = {
    merchantId: import.meta.env.VITE_KASPI_MERCHANT_ID || '',
    terminalId: import.meta.env.VITE_KASPI_TERMINAL_ID || '',
    apiKey: import.meta.env.VITE_KASPI_API_KEY || '',
  }
  
  if (config.merchantId) {
    kaspiApi.configure(config)
  }
}
