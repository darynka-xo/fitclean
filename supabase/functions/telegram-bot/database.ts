// database.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFile, MyContext } from "./telegram.ts";
import { BotState, Session } from "./types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getUser(chat_id: number) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("chat_id", chat_id)
    .single();

  if (error) {
    console.error("Error getting user:", error);
    return { error: new Error("Произошла ошибка. Свяжитесь с поддержкой") };
  }

  console.log("User retrieved successfully");

  return { user: data };
}

export async function createUser(
  chat_id: number,
  username: string,
  phone: string,
  bag_number?: string,
) {
  const { error } = await supabase
    .from("users")
    .insert({
      chat_id: chat_id,
      username: username,
      club_id: 1,
      phone: phone,
      bag_number: bag_number,
      subscription_id: 1,
    })
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return { error: new Error("Произошла ошибка. Свяжитесь с поддержкой") };
  }

  return {};
}

export async function getSession(chat_id: number): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("chat_id", chat_id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error getting session:", error);
  }

  return data || null;
}

export async function createOrUpdateSession(
  chat_id: number,
  state: BotState,
  context: any,
): Promise<boolean> {
  const session = await getSession(chat_id);

  if (session) {
    const { error } = await supabase
      .from("sessions")
      .update({
        state: state,
        context: context,
        last_updated: new Date().toISOString(),
      })
      .eq("chat_id", chat_id);

    if (error) {
      console.error("Error updating session:", error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from("sessions")
      .insert({
        chat_id: chat_id,
        state: state,
        context: context,
        last_updated: new Date().toISOString(),
      });

    if (error) {
      console.error("Error creating session:", error);
      return false;
    }
  }

  return true;
}

function ts(date: Date) {
  // YYYYMMDD_HHMMSS  →  20250731_203540
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

async function uploadFile(ctx: MyContext) {
  const fileID = ctx.message!.document!.file_id;
  const { data: url, error: err } = await getFile(
    fileID,
  );

  if (err) return err;

  const res = await fetch(url);
  if (!res.ok) {
    console.error("Не удалось скачать файл из Telegram.");
    return { error: new Error("Произошла ошибка. Свяжитесь с поддержкой") };
  }
  const buf = new Uint8Array(await res.arrayBuffer());

  const sentAt = ctx.message?.date ?? Math.floor(Date.now() / 1000);
  const fileName = `${ctx.chat!.id}_${ts(new Date(sentAt * 1000))}.pdf`;
  const path = `receipts/${ctx.chat!.id}/${fileName}`;

  const { data, error } = await supabase.storage
    .from("receipts")
    .upload(path, buf, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    console.error(error);
    return { error: new Error("Произошла ошибка. Свяжитесь с поддержкой") };
  }

  return {
    data: `${supabaseUrl}/storage/v1/object/public/${data.fullPath}`,
  };
}

export async function createOrder(ctx: MyContext) {
  const chatId = ctx.chat!.id;
  const { user } = await getUser(chatId);
  if (!user) {
    return { error: new Error("Пользователь не зарегистрирован!") };
  }

  const session = await getSession(chatId);

  // Advanced tariff eligibility check
  const { data: eligibilityData, error: eligibilityError } = await supabase.rpc('check_tariff_eligibility', {
    p_user_id: user.id,
    p_club_id: user.club_id
  });

  if (eligibilityError) {
    console.error("Tariff eligibility check error:", eligibilityError);
    return { error: new Error("Ошибка проверки тарифа. Свяжитесь с поддержкой") };
  }

  const eligibility = eligibilityData[0];
  let receiptPath = null;
  let price = eligibility.suggested_price || 1000;
  let tariffPrice = null;

  if (eligibility.eligible) {
    // Tariff-based order - no payment required
    tariffPrice = 0; // Covered by subscription
    price = 0;
    
    // Update subscription usage
    await supabase.rpc('update_subscription_usage', {
      p_user_id: user.id,
      p_club_id: user.club_id,
      p_increment: 1
    });
  } else {
    // Payment required
    if (eligibility.needs_payment) {
      const { data: uploadResult, error: err } = await uploadFile(ctx);
      if (err) {
        return { error: err };
      }
      receiptPath = uploadResult;
    }
  }

  const newOrder = {
    user_id: user.id,
    price: price,
    package_id: session?.context.package_id.toLowerCase(),
    receipt_url: receiptPath,
    club_id: user.club_id,
    status_id: 1,
    is_tariff_based: eligibility.eligible,
    tariff_price: tariffPrice,
  };

  const { error } = await supabase.from("orders").insert(newOrder);
  if (error) {
    console.error("Create order error: ", error);
    return { error: new Error("Произошла ошибка. Свяжитесь с поддержкой") };
  }

  return { 
    isTariffBased: eligibility.eligible, 
    remainingItems: eligibility.remaining_items,
    subscriptionType: eligibility.subscription_type
  };
}

// Function to verify pickup code and get order details
export async function verifyPickupCode(pickupCode: string, clubId: number) {
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      package_id,
      pickup_code,
      status_id,
      users!inner(username, phone),
      dim_status_types!inner(name)
    `)
    .eq("pickup_code", pickupCode)
    .eq("club_id", clubId)
    .eq("status_id", 3) // ready_for_pickup
    .single();

  if (error) {
    console.error("Pickup code verification error:", error);
    return { error: new Error("Неверный код или заказ не готов к выдаче") };
  }

  return { order };
}

// Function to complete order pickup
export async function completeOrderPickup(orderId: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status_id: 4 }) // completed
    .eq("id", orderId);

  if (error) {
    console.error("Complete pickup error:", error);
    return { error: new Error("Ошибка при завершении заказа") };
  }

  return {};
}

// Function to save client rating
export async function saveClientRating(orderId: string, userId: string, rating: number, comment?: string) {
  const { error } = await supabase
    .from("client_ratings")
    .insert({
      order_id: orderId,
      user_id: userId,
      rating,
      comment: comment || null,
    });

  if (error) {
    console.error("Save rating error:", error);
    return { error: new Error("Ошибка при сохранении оценки") };
  }

  return {};
}

// Function to get user's order history with ratings
export async function getUserOrderHistory(chatId: number) {
  const { data: orders, error } = await supabase
    .from("order_analytics")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Get order history error:", error);
    return { error: new Error("Ошибка при получении истории заказов") };
  }

  return { orders };
}

// Function to upload order photo
export async function uploadOrderPhoto(ctx: MyContext, photoType: 'received' | 'processed' | 'ready', orderId?: string, description?: string) {
  const chatId = ctx.chat!.id;
  
  // Get staff user
  const { user } = await getUser(chatId);
  if (!user) {
    return { error: new Error("Пользователь не зарегистрирован!") };
  }

  // Get photo file
  const photo = ctx.message?.photo?.[ctx.message.photo.length - 1]; // Get highest resolution
  if (!photo) {
    return { error: new Error("Фото не найдено") };
  }

  try {
    // Get file from Telegram
    const { data: fileUrl, error: fileError } = await getFile(photo.file_id);
    if (fileError) {
      return { error: fileError };
    }

    // Download the photo
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return { error: new Error("Не удалось скачать фото") };
    }

    const photoBuffer = new Uint8Array(await response.arrayBuffer());
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${chatId}_${photoType}_${timestamp}.jpg`;
    const storagePath = `order_photos/${user.club_id}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("order_photos")
      .upload(storagePath, photoBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Photo upload error:", uploadError);
      return { error: new Error("Ошибка загрузки фото") };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("order_photos")
      .getPublicUrl(storagePath);

    // Save photo record to database
    const photoRecord = {
      order_id: orderId || null,
      uploaded_by: user.id,
      photo_url: publicUrl,
      photo_type: photoType,
      description: description || null,
    };

    const { error: dbError } = await supabase
      .from("order_photos")
      .insert(photoRecord);

    if (dbError) {
      console.error("Photo record save error:", dbError);
      return { error: new Error("Ошибка сохранения записи о фото") };
    }

    return { photoUrl: publicUrl };
  } catch (err) {
    console.error("Photo upload error:", err);
    return { error: new Error("Произошла ошибка при загрузке фото") };
  }
}

// Function to get order photos
export async function getOrderPhotos(orderId: string) {
  const { data, error } = await supabase
    .from("order_photos")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get photos error:", error);
    return { error: new Error("Ошибка получения фотографий") };
  }

  return { photos: data };
}

// Function to get employee notifications
export async function getEmployeeNotifications(clubId: number, userId?: string, limit: number = 20) {
  let query = supabase
    .from("employee_notifications")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter by recipient if specified
  if (userId) {
    query = query.or(`recipient_id.is.null,recipient_id.eq.${userId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get notifications error:", error);
    return { error: new Error("Ошибка получения уведомлений") };
  }

  return { notifications: data };
}

// Function to mark notification as read
export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("employee_notifications")
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq("id", notificationId);

  if (error) {
    console.error("Mark notification read error:", error);
    return { error: new Error("Ошибка отметки уведомления") };
  }

  return {};
}
