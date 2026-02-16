// telegram.ts
import {
  Context,
  MiddlewareFn,
} from "https://deno.land/x/grammy@v1.37.0/mod.ts";

import { BotState, Session } from "./types.ts";
import {
  createOrder,
  createOrUpdateSession,
  createUser,
  getSession,
  getUser,
  verifyPickupCode,
  completeOrderPickup,
  saveClientRating,
  uploadOrderPhoto,
  getEmployeeNotifications,
} from "./database.ts";
import reply from "./text.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "mocked_token";
const API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface MyContext extends Context {
  stateFromDB: Session | null;
}

export const loadSession: MiddlewareFn<MyContext> = async (ctx, next) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return next();

  const session = await getSession(ctx.chat.id);

  ctx.stateFromDB = session;

  await next();
};

export const stateRouter: MiddlewareFn<MyContext> = async (ctx, next) => {
  const chatId = ctx.chat!.id;
  if (!chatId) return next();

  console.log(`
    User: ${chatId}
    State: ${ctx.stateFromDB?.state}
    Message text: ${ctx.message?.text}
    Document:${ctx.message?.document?.file_name}`);

  switch (ctx.stateFromDB?.state) {
    case BotState.WAITING_NAME:
      ctx.reply(
        "Поделитесь номером на который зарегистрирован аккаунт телеграм",
        { reply_markup: reply.buttons.shareContact },
      );
      return await createOrUpdateSession(chatId, BotState.WAITING_PHONE, {
        username: ctx.message!.text,
      });

    case BotState.WAITING_PHONE:
      // After phone, ask for bag number
      ctx.reply("Введите номер мешка");
      return await createOrUpdateSession(chatId, BotState.WAITING_BAG_NUMBER, {
        ...ctx.stateFromDB?.context,
        phone: ctx.message!.contact!.phone_number,
      });

    case BotState.WAITING_BAG_NUMBER:
      // After bag number, show tariff selection
      ctx.reply("Выберите тариф:", { reply_markup: reply.buttons.tariffButtons });
      return await createOrUpdateSession(chatId, BotState.WAITING_TARIFF_SELECTION, {
        ...ctx.stateFromDB?.context,
        bag_number: ctx.message!.text,
      });

    case BotState.WAITING_TARIFF_SELECTION:
      return await handleTariffSelection(ctx);

    case BotState.WAITING_PACKAGE:
      // Check if user has subscription (tariff-based)
      const { user: packageUser } = await getUser(chatId);
      const isTariffBased = packageUser && packageUser.subscription_id > 1;
      
      if (isTariffBased) {
        // For tariff-based clients, create order immediately
        await createOrUpdateSession(chatId, BotState.WAITING_RECEIPT, {
          package_id: ctx.message!.text,
        });
        return await createNewOrder(ctx);
      } else {
        // For non-tariff clients, request payment
        ctx.reply(reply.messages.payMessage);
        return await createOrUpdateSession(chatId, BotState.WAITING_RECEIPT, {
          package_id: ctx.message!.text,
        });
      }

    case BotState.WAITING_PICKUP_CODE:
      return await handlePickupCodeVerification(ctx);

    case BotState.WAITING_RATING:
      return await handleRatingInput(ctx);

    case BotState.WAITING_RATING_COMMENT:
      return await handleRatingComment(ctx);

    case BotState.WAITING_PHOTO_ORDER_ID:
      return await handlePhotoOrderId(ctx);

    case BotState.WAITING_PHOTO_UPLOAD:
      return await handlePhotoUpload(ctx);
  }

  await next();
};

export async function getFile(fileId: string): Promise<any> {
  const response = await fetch(`${API_URL}/getFile?file_id=${fileId}`);
  const data = await response.json();

  if (data.ok && data.result && data.result.file_path) {
    return {
      data:
        `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`,
    };
  }

  return { error: new Error("Failed to get file URL") };
}

async function registerNewUser(ctx: MyContext) {
  const { user } = await getUser(ctx.chat!.id);
  if (user) {
    ctx.reply("Пользователь уже зарегистрирован!", {
      reply_markup: { remove_keyboard: true },
    });
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  const { error } = await createUser(
    ctx.chat!.id,
    ctx.stateFromDB!.context.username,
    ctx.message!.contact!.phone_number,
  );
  if (error) {
    ctx.reply(error.message);
    return;
  }
  ctx.reply("Вы успешно зарегистрированы!", {
    reply_markup: reply.buttons.menuBut,
  });

  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});

  return;
}

export async function createNewOrder(ctx: MyContext) {
  const { user } = await getUser(ctx.chat!.id);
  if (!user) {
    ctx.reply("Пользователь не зарегистрирован!");
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  const { error, isTariffBased, remainingItems, subscriptionType } = await createOrder(ctx);
  if (error) {
    ctx.reply(error.message);
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  // Get the created order to show proper confirmation
  const { data: createdOrder } = await supabase
    .from('orders')
    .select('id, order_number, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const orderNumber = createdOrder?.order_number || 'N/A';
  const orderDate = new Date(createdOrder?.created_at || new Date()).toLocaleDateString('ru-RU');

  // Send proper order confirmation message according to script
  const confirmationMessage = reply.messages.statusMessages.orderAccepted(orderNumber, orderDate);
  ctx.reply(confirmationMessage, { reply_markup: reply.buttons.menuBut });

  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
  return;
}

// Handle pickup code verification
async function handlePickupCodeVerification(ctx: MyContext) {
  const pickupCode = ctx.message?.text?.trim();
  if (!pickupCode || pickupCode.length !== 4 || !/^\d{4}$/.test(pickupCode)) {
    ctx.reply("Пожалуйста, введите корректный 4-значный код");
    return;
  }

  const { user } = await getUser(ctx.chat!.id);
  if (!user) {
    ctx.reply("Ошибка: пользователь не найден");
    return;
  }

  const { order, error } = await verifyPickupCode(pickupCode, user.club_id);
  if (error) {
    ctx.reply(error.message);
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  // Complete the pickup
  const { error: completeError } = await completeOrderPickup(order.id);
  if (completeError) {
    ctx.reply(completeError.message);
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  ctx.reply(
    `✅ Заказ успешно выдан!\n` +
    `Пакет: ${order.package_id}\n` +
    `Клиент: ${order.users.username}\n\n` +
    `Пожалуйста, оцените качество обслуживания от 1 до 5:`
  );

  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_RATING, {
    order_id: order.id,
  });
}

// Handle rating input
async function handleRatingInput(ctx: MyContext) {
  const ratingText = ctx.message?.text?.trim();
  const rating = parseInt(ratingText || "");

  if (!rating || rating < 1 || rating > 5) {
    ctx.reply("Пожалуйста, введите оценку от 1 до 5");
    return;
  }

  ctx.reply("Спасибо за оценку! Хотите оставить комментарий? (или напишите 'пропустить')");
  
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_RATING_COMMENT, {
    ...ctx.stateFromDB?.context,
    rating,
  });
}

// Handle rating comment
async function handleRatingComment(ctx: MyContext) {
  const comment = ctx.message?.text?.trim();
  const session = ctx.stateFromDB;
  
  if (!session?.context.order_id || !session.context.rating) {
    ctx.reply("Ошибка: данные сессии не найдены");
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  const { user } = await getUser(ctx.chat!.id);
  if (!user) {
    ctx.reply("Ошибка: пользователь не найден");
    return;
  }

  const finalComment = comment === 'пропустить' ? undefined : comment;
  
  // Save to both tables for backward compatibility and enhanced analytics
  const { error } = await saveClientRating(
    session.context.order_id,
    user.id,
    session.context.rating,
    finalComment
  );

  // Also save to satisfaction history with more details
  const { error: satisfactionError } = await supabase.rpc('create_satisfaction_entry', {
    p_user_id: user.id,
    p_order_id: session.context.order_id,
    p_club_id: user.club_id,
    p_rating: session.context.rating,
    p_comment: finalComment,
    p_service_quality: session.context.rating, // Use same rating for now
    p_speed_rating: session.context.rating,
    p_cleanliness_rating: session.context.rating,
    p_staff_rating: session.context.rating,
    p_would_recommend: session.context.rating >= 4,
    p_improvement_suggestions: finalComment
  });

  if (error || satisfactionError) {
    ctx.reply(error?.message || satisfactionError?.message || "Ошибка сохранения отзыва");
  } else {
    ctx.reply(
      "✅ Спасибо за отзыв! Ваше мнение поможет нам улучшить качество обслуживания.\n" +
      "🎯 Ваша оценка сохранена в системе аналитики для постоянного улучшения сервиса.",
      { reply_markup: reply.buttons.menuBut }
    );
  }

  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
}

// Handle photo order ID input
async function handlePhotoOrderId(ctx: MyContext) {
  const orderInput = ctx.message?.text?.trim();
  if (!orderInput) {
    ctx.reply("Пожалуйста, введите номер заказа или 'отмена' для выхода");
    return;
  }

  if (orderInput.toLowerCase() === 'отмена') {
    ctx.reply("Отменено", { reply_markup: reply.buttons.menuBut });
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  const session = ctx.stateFromDB;
  if (!session?.context.photo_type) {
    ctx.reply("Ошибка: тип фото не определен");
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  // Check if order exists
  const { user } = await getUser(ctx.chat!.id);
  if (!user) {
    ctx.reply("Ошибка: пользователь не найден");
    return;
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, package_id, status_id')
    .eq('club_id', user.club_id)
    .or(`id.eq.${orderInput},order_number.eq.${orderInput}`)
    .single();

  if (error || !order) {
    ctx.reply("Заказ не найден. Проверьте номер заказа и попробуйте снова.");
    return;
  }

  const photoTypeText = {
    'received': 'получения',
    'processed': 'обработки', 
    'ready': 'готового к выдаче'
  }[session.context.photo_type];

  ctx.reply(
    `✅ Заказ найден: ${order.order_number}\n` +
    `Пакет: ${order.package_id}\n\n` +
    `Теперь отправьте фото ${photoTypeText} заказа:`
  );

  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_PHOTO_UPLOAD, {
    ...session.context,
    order_id: order.id,
  });
}

// Handle photo upload
async function handlePhotoUpload(ctx: MyContext) {
  const session = ctx.stateFromDB;
  if (!session?.context.order_id || !session.context.photo_type) {
    ctx.reply("Ошибка: данные сессии не найдены");
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  if (!ctx.message?.photo) {
    ctx.reply("Пожалуйста, отправьте фотографию");
    return;
  }

  ctx.reply("📸 Загружаем фото...");

  const { photoUrl, error } = await uploadOrderPhoto(
    ctx,
    session.context.photo_type,
    session.context.order_id,
    ctx.message.caption || undefined
  );

  if (error) {
    ctx.reply(`❌ Ошибка загрузки: ${error.message}`);
    return;
  }

  const photoTypeText = {
    'received': 'получения',
    'processed': 'обработки',
    'ready': 'готового к выдаче'
  }[session.context.photo_type];

  ctx.reply(
    `✅ Фото ${photoTypeText} успешно загружено!\n` +
    `Фото сохранено и уведомление отправлено команде.`,
    { reply_markup: reply.buttons.menuBut }
  );

  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
}

// Handle notifications request
export async function handleNotificationsRequest(ctx: MyContext) {
  const { user } = await getUser(ctx.chat!.id);
  if (!user) {
    ctx.reply("Ошибка: пользователь не найден");
    return;
  }

  const { notifications, error } = await getEmployeeNotifications(user.club_id, user.id, 10);
  if (error) {
    ctx.reply(`Ошибка получения уведомлений: ${error.message}`);
    return;
  }

  if (!notifications || notifications.length === 0) {
    ctx.reply("📭 Новых уведомлений нет");
    return;
  }

  let message = "🔔 Последние уведомления:\n\n";
  
  notifications.slice(0, 5).forEach((notif, index) => {
    const date = new Date(notif.created_at).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const priority = notif.priority === 'high' ? '🔥' : notif.priority === 'urgent' ? '🚨' : '';
    const readStatus = notif.is_read ? '' : '🆕';
    
    message += `${priority}${readStatus} ${notif.title}\n`;
    message += `📝 ${notif.message}\n`;
    message += `📅 ${date}\n\n`;
  });

  if (notifications.length > 5) {
    message += `... и еще ${notifications.length - 5} уведомлений`;
  }

  ctx.reply(message, { reply_markup: reply.buttons.menuBut });
}

// Handle tariff selection
async function handleTariffSelection(ctx: MyContext) {
  const session = ctx.stateFromDB;
  if (!session?.context.username || !session.context.phone || !session.context.bag_number) {
    ctx.reply("Ошибка: данные регистрации не найдены. Начните заново.");
    await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
    return;
  }

  // Get tariff type from callback data (will be set by callback handlers)
  const tariffType = session.context.tariff_type;
  if (!tariffType) {
    ctx.reply("Пожалуйста, выберите тариф из предложенных вариантов");
    return;
  }

  // Map tariff types to subscription IDs
  const tariffMapping: { [key: string]: number } = {
    'trial': 1,     // No subscription
    'weekly': 2,    // Weekly subscription  
    'monthly': 3,   // Monthly subscription
    'quarter': 3,   // Quarterly (use monthly for now)
    'half_year': 3, // Half year (use monthly for now)
    'year': 3       // Yearly (use monthly for now)
  };

  const subscriptionId = tariffMapping[tariffType] || 1;

  // Create user with all collected data
  const { error } = await createUser(
    ctx.chat!.id,
    session.context.username,
    session.context.phone,
    session.context.bag_number
  );

  if (error) {
    ctx.reply(error.message);
    return;
  }

  // Update user with selected subscription
  await supabase
    .from("users")
    .update({ subscription_id: subscriptionId })
    .eq("chat_id", ctx.chat!.id);

  if (tariffType === 'trial') {
    ctx.reply(
      "🎉 Регистрация завершена!\n\n" +
      "Для разовой стирки потребуется оплата. Когда будете готовы сдать одежду, выберите 'Сдать одежду' в меню.",
      { reply_markup: reply.buttons.menuBut }
    );
  } else {
    ctx.reply(
      `🎉 Регистрация завершена!\n\n` +
      `Оплатите тариф по ссылке: ${paymentURL}\n` +
      `Обязательно отправьте чек ответным сообщением для активации подписки.`,
      { reply_markup: reply.buttons.menuBut }
    );
  }

  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
}


// Handle rating selection from buttons  
export async function handleRatingSelection(ctx: MyContext, rating: number) {
  const { user } = await getUser(ctx.chat!.id);
  if (!user) {
    ctx.reply("Ошибка: пользователь не найден");
    return;
  }

  // Find the most recent completed order for this user
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("user_id", user.id)
    .eq("status_id", 4) // completed
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !order) {
    ctx.reply("Не найден завершенный заказ для оценки");
    return;
  }

  // Save rating and satisfaction data
  const { error: ratingError } = await saveClientRating(order.id, user.id, rating);
  
  if (ratingError) {
    ctx.reply(`Ошибка сохранения оценки: ${ratingError.message}`);
  } else {
    ctx.reply(
      `✅ Спасибо за оценку ${rating} ⭐!

` +
      `Ваш отзыв поможет нам улучшить качество обслуживания.`,
      { reply_markup: reply.buttons.menuBut }
    );
  }

  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
}

export async function handleRatingSelection(ctx: MyContext, rating: number) {
  ctx.reply(`✅ Спасибо за оценку ${rating} ⭐!`, { reply_markup: reply.buttons.menuBut });
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
}
