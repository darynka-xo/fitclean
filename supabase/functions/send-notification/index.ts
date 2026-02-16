/**
 * Notification Service
 * Sends notifications via Telegram or WhatsApp based on order status changes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL") || "";
const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY") || "";

interface NotificationRequest {
  user_id: string;
  order_id: string;
  notification_type: 'order_received' | 'order_in_laundry' | 'order_washed' | 'order_ready' | 'order_reminder' | 'order_problem';
  channel: 'telegram' | 'whatsapp' | 'both';
  custom_message?: string;
}

const NOTIFICATION_MESSAGES = {
  order_received: {
    telegram: (orderNumber: string) => 
      `💬 Ваш заказ №${orderNumber} принят и отправится в прачечную в ближайшее время. Мы сообщим, когда стирка начнётся.`,
    whatsapp: (orderNumber: string) => 
      `💬 Ваш заказ №${orderNumber} принят и отправится в прачечную в ближайшее время. Мы сообщим, когда стирка начнётся.`,
  },
  order_in_laundry: {
    telegram: (orderNumber: string, bagNumber: string) => 
      `🧺 Ваши вещи поступили в прачечную и скоро будут постираны. Номер мешка: ${bagNumber}.`,
    whatsapp: (orderNumber: string, bagNumber: string) => 
      `🧺 Ваши вещи поступили в прачечную и скоро будут постираны. Номер мешка: ${bagNumber}.`,
  },
  order_washed: {
    telegram: (orderNumber: string) => 
      `✨ Ваши вещи постираны и проходят финальную подготовку. Вскоре они будут доступны к выдаче.`,
    whatsapp: (orderNumber: string) => 
      `✨ Ваши вещи постираны и проходят финальную подготовку. Вскоре они будут доступны к выдаче.`,
  },
  order_ready: {
    telegram: (orderNumber: string, lockerName: string, cellNumber: string) => 
      `📦 Ваши вещи готовы к выдаче! Заберите их в клубе ${lockerName}. Ячейка №${cellNumber}. Спасибо, что выбираете FitClean!`,
    whatsapp: (orderNumber: string, lockerName: string, cellNumber: string) => 
      `📦 Ваши вещи готовы к выдаче! Заберите их в клубе ${lockerName}. Ячейка №${cellNumber}. Спасибо, что выбираете FitClean!`,
  },
  order_reminder: {
    telegram: (orderNumber: string, cellNumber: string) => 
      `⏰ Напоминаем, что ваши вещи всё ещё ждут вас в ячейке №${cellNumber}. Постамат работает до 22:00.`,
    whatsapp: (orderNumber: string, cellNumber: string) => 
      `⏰ Напоминаем, что ваши вещи всё ещё ждут вас в ячейке №${cellNumber}. Постамат работает до 22:00.`,
  },
  order_problem: {
    telegram: (orderNumber: string) => 
      `⚠️ Ваш заказ №${orderNumber} требует уточнения. Наш менеджер свяжется с вами для решения вопроса.`,
    whatsapp: (orderNumber: string) => 
      `⚠️ Ваш заказ №${orderNumber} требует уточнения. Наш менеджер свяжется с вами для решения вопроса.`,
  },
};

/**
 * Send Telegram message
 */
async function sendTelegramMessage(chatId: number, message: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

/**
 * Send WhatsApp message
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  try {
    if (!WHATSAPP_API_URL || !WHATSAPP_API_KEY) {
      console.warn('WhatsApp API not configured');
      return false;
    }

    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
      },
      body: JSON.stringify({
        to: phone,
        message: message,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
}

serve(async (req) => {
  try {
    const notification: NotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("chat_id, phone, username")
      .eq("id", notification.user_id)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${notification.user_id}`);
    }

    // Get order data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("order_number, package_id, club_id, clubs(name)")
      .eq("id", notification.order_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${notification.order_id}`);
    }

    // Get message template
    let message = notification.custom_message;
    if (!message) {
      const template = NOTIFICATION_MESSAGES[notification.notification_type];
      
      if (notification.notification_type === 'order_ready') {
        message = notification.channel === 'telegram'
          ? template.telegram(
              order.order_number || notification.order_id.slice(0, 8),
              (order.clubs as any)?.name || 'клуба',
              'XX' // Cell number should come from locker integration
            )
          : template.whatsapp(
              order.order_number || notification.order_id.slice(0, 8),
              (order.clubs as any)?.name || 'клуба',
              'XX'
            );
      } else if (notification.notification_type === 'order_in_laundry') {
        message = notification.channel === 'telegram'
          ? template.telegram(
              order.order_number || notification.order_id.slice(0, 8),
              order.package_id || 'N/A'
            )
          : template.whatsapp(
              order.order_number || notification.order_id.slice(0, 8),
              order.package_id || 'N/A'
            );
      } else {
        message = notification.channel === 'telegram'
          ? template.telegram(order.order_number || notification.order_id.slice(0, 8))
          : template.whatsapp(order.order_number || notification.order_id.slice(0, 8));
      }
    }

    // Send notifications
    const results = {
      telegram: false,
      whatsapp: false,
    };

    if ((notification.channel === 'telegram' || notification.channel === 'both') && user.chat_id) {
      results.telegram = await sendTelegramMessage(Number(user.chat_id), message);
    }

    if ((notification.channel === 'whatsapp' || notification.channel === 'both') && user.phone) {
      // Format phone number (remove +, ensure country code)
      const phone = user.phone.replace(/\+/g, '').replace(/\s/g, '');
      results.whatsapp = await sendWhatsAppMessage(phone, message);
    }

    // Log notification
    await supabase.from("notification_logs").insert({
      user_id: notification.user_id,
      order_id: notification.order_id,
      notification_type: notification.notification_type,
      channel: notification.channel,
      message: message,
      telegram_sent: results.telegram,
      whatsapp_sent: results.whatsapp,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    );
  }
});

