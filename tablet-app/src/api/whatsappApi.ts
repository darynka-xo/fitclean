/**
 * WhatsApp Notification API Client
 * 
 * In MOCK mode - everything is instant and fake
 */

// Check if mock mode is enabled
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true' || !import.meta.env.VITE_WHATSAPP_API_URL

export type NotificationType = 
  | 'otp_code'
  | 'order_received'
  | 'order_in_laundry'
  | 'order_ready'
  | 'order_reminder'

export interface SendNotificationRequest {
  phone: string
  type: NotificationType
  data: Record<string, string | number>
  language?: 'ru' | 'kk' | 'en'
}

export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
}

class WhatsAppApiClient {
  /**
   * Send OTP code via WhatsApp
   */
  async sendOTP(phone: string, code: string, language: 'ru' | 'kk' | 'en' = 'ru'): Promise<NotificationResult> {
    if (MOCK_MODE) {
      console.log(`📱 [MOCK] OTP sent to ${phone}: ${code}`)
      return { success: true, messageId: `mock-${Date.now()}` }
    }
    
    return this.sendNotification({
      phone,
      type: 'otp_code',
      data: { code },
      language,
    })
  }

  /**
   * Send order received notification
   */
  async sendOrderReceived(
    phone: string,
    orderNumber: string,
    cellNumber: number,
    language: 'ru' | 'kk' | 'en' = 'ru'
  ): Promise<NotificationResult> {
    if (MOCK_MODE) {
      console.log(`📱 [MOCK] Order received notification sent to ${phone}: Order ${orderNumber}, Cell ${cellNumber}`)
      return { success: true, messageId: `mock-${Date.now()}` }
    }
    
    return this.sendNotification({
      phone,
      type: 'order_received',
      data: { orderNumber, cellNumber },
      language,
    })
  }

  /**
   * Send order ready notification
   */
  async sendOrderReady(
    phone: string,
    orderNumber: string,
    pickupCode: string,
    cellNumber: number,
    language: 'ru' | 'kk' | 'en' = 'ru'
  ): Promise<NotificationResult> {
    if (MOCK_MODE) {
      console.log(`📱 [MOCK] Order ready notification sent to ${phone}: Order ${orderNumber}, Code ${pickupCode}`)
      return { success: true, messageId: `mock-${Date.now()}` }
    }
    
    return this.sendNotification({
      phone,
      type: 'order_ready',
      data: { orderNumber, pickupCode, cellNumber },
      language,
    })
  }

  /**
   * Generic notification sender
   */
  async sendNotification(request: SendNotificationRequest): Promise<NotificationResult> {
    if (MOCK_MODE) {
      console.log(`📱 [MOCK] Notification:`, request)
      return { success: true, messageId: `mock-${Date.now()}` }
    }
    
    try {
      const response = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.message || 'Failed to send notification',
        }
      }

      return response.json()
    } catch (error) {
      console.error('WhatsApp notification error:', error)
      return {
        success: false,
        error: 'Network error',
      }
    }
  }
}

export const whatsappApi = new WhatsAppApiClient()
