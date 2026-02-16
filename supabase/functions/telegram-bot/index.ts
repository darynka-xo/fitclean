// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

console.log(`Function "telegram-bot" up and running!`);

import {
  Bot,
  webhookCallback,
} from "https://deno.land/x/grammy@v1.37.0/mod.ts";

import reply from "./text.ts";

import { BotState } from "./types.ts";
import { loadSession, MyContext, stateRouter, createNewOrder, handleNotificationsRequest, handleRatingSelection } from "./telegram.ts";
import { createOrUpdateSession } from "./database.ts";

const bot = new Bot<MyContext>(Deno.env.get("TELEGRAM_BOT_TOKEN") || "mocked_token_for_testing");

bot.command("ping", (ctx) => ctx.reply(`Pong! ${new Date()} ${Date.now()}`));

bot.use(loadSession);
bot.use(stateRouter);

bot.command(
  "start",
  (ctx) =>
    ctx.reply(reply.messages.hello, {
      reply_markup: reply.buttons.registerKey,
    }),
);

bot.command("menu", async (ctx) => {
  ctx.reply("Меню", { reply_markup: reply.buttons.menuButtons });
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
});

bot.callbackQuery("about", async (ctx) => {
  ctx.reply(reply.messages.about, {
    reply_markup: { remove_keyboard: true },
  });
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("price", async (ctx) => {
  ctx.reply(reply.messages.price, {
    reply_markup: { remove_keyboard: true },
  });
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_COMMAND, {});
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("register", async (ctx) => {
  ctx.reply("Введите ваши ФИО");
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_NAME, {});
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("order_create", async (ctx) => {
  ctx.reply("Введите номер пакета");
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_PACKAGE, {});
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("pickup_verify", async (ctx) => {
  ctx.reply("Введите 4-значный код получения заказа");
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_PICKUP_CODE, {});
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("photo_received", async (ctx) => {
  ctx.reply("Введите номер заказа для загрузки фото получения:");
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_PHOTO_ORDER_ID, {
    photo_type: 'received'
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("photo_processed", async (ctx) => {
  ctx.reply("Введите номер заказа для загрузки фото обработки:");
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_PHOTO_ORDER_ID, {
    photo_type: 'processed'
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("photo_ready", async (ctx) => {
  ctx.reply("Введите номер заказа для загрузки фото готового заказа:");
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_PHOTO_ORDER_ID, {
    photo_type: 'ready'
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("notifications", async (ctx) => {
  await handleNotificationsRequest(ctx);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("care", async (ctx) => {
  ctx.reply(reply.messages.care, {
    reply_markup: { remove_keyboard: true },
  });
  await ctx.answerCallbackQuery();
});

// Tariff selection callbacks
bot.callbackQuery("tariff_trial", async (ctx) => {
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_TARIFF_SELECTION, {
    ...ctx.stateFromDB?.context,
    tariff_type: 'trial',
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("tariff_weekly", async (ctx) => {
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_TARIFF_SELECTION, {
    ...ctx.stateFromDB?.context,
    tariff_type: 'weekly',
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("tariff_monthly", async (ctx) => {
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_TARIFF_SELECTION, {
    ...ctx.stateFromDB?.context,
    tariff_type: 'monthly',
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("tariff_quarter", async (ctx) => {
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_TARIFF_SELECTION, {
    ...ctx.stateFromDB?.context,
    tariff_type: 'quarter',
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("tariff_half_year", async (ctx) => {
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_TARIFF_SELECTION, {
    ...ctx.stateFromDB?.context,
    tariff_type: 'half_year',
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("tariff_year", async (ctx) => {
  await createOrUpdateSession(ctx.chat!.id, BotState.WAITING_TARIFF_SELECTION, {
    ...ctx.stateFromDB?.context,
    tariff_type: 'year',
  });
  await ctx.answerCallbackQuery();
});

// Rating callbacks
bot.callbackQuery("rate_1", async (ctx) => {
  await handleRatingSelection(ctx, 1);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("rate_2", async (ctx) => {
  await handleRatingSelection(ctx, 2);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("rate_3", async (ctx) => {
  await handleRatingSelection(ctx, 3);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("rate_4", async (ctx) => {
  await handleRatingSelection(ctx, 4);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("rate_5", async (ctx) => {
  await handleRatingSelection(ctx, 5);
  await ctx.answerCallbackQuery();
});

bot.on("message:document", async (ctx) => {
  if (ctx.stateFromDB?.state === BotState.WAITING_RECEIPT) {
    await createNewOrder(ctx);
    return await createOrUpdateSession(
      ctx.chat!.id,
      BotState.WAITING_COMMAND,
      {},
    );
  }
});

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  if (req.method === "POST") {
    try {
      const url = new URL(req.url);
      if (url.searchParams.get("secret") !== Deno.env.get("FUNCTION_SECRET")) {
        return new Response("not allowed", { status: 405 });
      }
      return await handleUpdate(req);
    } catch (err) {
      console.error(err);
      return new Response("oops", { status: 500 });
    }
  }
  return new Response("not found", { status: 404 });
});
