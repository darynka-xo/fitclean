"""
WhatsApp UltraMsg Integration Service
Handles all WhatsApp notifications for order status updates
"""
import httpx
from typing import Optional
from ..core.config import settings


class WhatsAppService:
    """Service for sending WhatsApp messages via UltraMsg API"""
    
    def __init__(self):
        self.instance_id = settings.ULTRAMSG_INSTANCE_ID
        self.token = settings.ULTRAMSG_TOKEN
        self.base_url = settings.ULTRAMSG_API_URL
    
    async def send_message(self, phone: str, message: str) -> dict:
        """
        Send a WhatsApp message to a phone number
        
        Args:
            phone: Phone number in international format (e.g., +77001234567)
            message: Message text to send
            
        Returns:
            API response dict
        """
        # Format phone number (remove + if present, add country code if needed)
        phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        
        url = f"{self.base_url}/messages/chat"
        payload = {
            "token": self.token,
            "to": phone,
            "body": message
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, data=payload)
                return {"success": True, "response": response.json()}
            except Exception as e:
                return {"success": False, "error": str(e)}
    
    # ===========================================
    # Order Status Notification Templates
    # ===========================================
    
    async def notify_order_accepted(self, phone: str, order_number: str) -> dict:
        """
        Status 1: Order accepted - items placed in locker
        Triggered: When client closes locker cell after placing items
        """
        message = (
            f"💬 Ваш заказ №{order_number} принят и отправится в прачечную "
            f"в ближайшее время. Мы сообщим, когда стирка начнётся."
        )
        return await self.send_message(phone, message)
    
    async def notify_items_received_at_laundry(
        self, phone: str, order_number: str, bag_number: str
    ) -> dict:
        """
        Status 2: Items received at laundry
        Triggered: When laundry staff takes photo and confirms receipt
        """
        message = (
            f"🧺 Ваши вещи поступили в прачечную и скоро будут постираны. "
            f"Номер мешка: {bag_number}."
        )
        return await self.send_message(phone, message)
    
    async def notify_items_washed(self, phone: str, order_number: str) -> dict:
        """
        Status 3: Items washed (intermediate status)
        Triggered: When laundry staff marks bag as "washed"
        """
        message = (
            f"✨ Ваши вещи постираны и проходят финальную подготовку. "
            f"Вскоре они будут доступны к выдаче."
        )
        return await self.send_message(phone, message)
    
    async def notify_ready_for_pickup(
        self, phone: str, order_number: str, club_name: str, cell_number: str
    ) -> dict:
        """
        Status 4: Ready for pickup
        Triggered: When courier places clean items in locker cell
        """
        message = (
            f"📦 Ваши вещи готовы к выдаче! Заберите их в клубе {club_name}. "
            f"Ячейка №{cell_number}. Спасибо, что выбираете FitClean!"
        )
        return await self.send_message(phone, message)
    
    async def notify_order_completed(self, phone: str, order_number: str) -> dict:
        """
        Status 5: Order completed
        Triggered: When client picks up items from locker
        """
        message = (
            f"Ваш заказ №{order_number} завершён. "
            f"Спасибо, что воспользовались FitClean!"
        )
        return await self.send_message(phone, message)
    
    async def notify_pickup_reminder(
        self, phone: str, order_number: str, cell_number: str, working_hours: str = "до 22:00"
    ) -> dict:
        """
        Reminder: Items not picked up (24-48h)
        Triggered: Scheduled task
        """
        message = (
            f"⏰ Напоминаем, что ваши вещи всё ещё ждут вас в ячейке №{cell_number}. "
            f"Постамат работает {working_hours}."
        )
        return await self.send_message(phone, message)
    
    async def notify_subscription_expiring(
        self, phone: str, remaining_washes: int, payment_link: Optional[str] = None
    ) -> dict:
        """
        Subscription expiring notification
        Triggered: After last wash in subscription
        """
        if remaining_washes == 0:
            message = (
                f"🔄 Вы использовали все стирки по тарифу. "
                f"Продлите подписку, чтобы пользоваться без перерывов."
            )
        else:
            message = (
                f"🔄 У вас осталось {remaining_washes} стирка(ок) по тарифу. "
                f"Продлите подписку заранее!"
            )
        
        if payment_link:
            message += f"\n\nОплатить: {payment_link}"
        
        return await self.send_message(phone, message)
    
    async def notify_issue_reported(
        self, phone: str, order_number: str
    ) -> dict:
        """
        Issue/incident notification
        Triggered: When order is flagged with a problem
        """
        message = (
            f"⚠️ Ваш заказ №{order_number} требует уточнения. "
            f"Наш менеджер свяжется с вами для решения вопроса."
        )
        return await self.send_message(phone, message)
    
    async def notify_admin_issue(
        self, admin_phone: str, client_name: str, client_phone: str, 
        order_number: str, issue_description: str
    ) -> dict:
        """
        Alert to admin about customer issue
        Triggered: When customer reports problem (thumbs down)
        """
        message = (
            f"🚨 ПРОБЛЕМА С ЗАКАЗОМ\n\n"
            f"Заказ: №{order_number}\n"
            f"Клиент: {client_name}\n"
            f"Телефон: {client_phone}\n\n"
            f"Описание проблемы:\n{issue_description}"
        )
        return await self.send_message(admin_phone, message)
    
    async def send_verification_code(self, phone: str, code: str) -> dict:
        """
        Send SMS verification code for registration
        """
        message = f"Ваш код подтверждения FitClean: {code}"
        return await self.send_message(phone, message)


# Singleton instance
whatsapp_service = WhatsAppService()
