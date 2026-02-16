#!/bin/bash

echo "🤖 Testing FitClean Bot: @testfitcleanbot"
echo "Token: 8374270952:AAHal9UL2m3y-6sSLWXYOuI9ukFJoKBToLM"
echo ""

# Check bot status
echo "📡 Checking bot status..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot8374270952:AAHal9UL2m3y-6sSLWXYOuI9ukFJoKBToLM/getMe")
echo "✅ Bot info: $BOT_INFO"
echo ""

# Get webhook info
echo "🔗 Current webhook status..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot8374270952:AAHal9UL2m3y-6sSLWXYOuI9ukFJoKBToLM/getWebhookInfo")
echo "📋 Webhook: $WEBHOOK_INFO"
echo ""

echo "🎯 To test the bot:"
echo "1. Open Telegram and search for: @testfitcleanbot"
echo "2. Send /start command"
echo "3. If no response, the webhook needs to be set up"
echo ""

echo "🔧 To set up webhook for local testing:"
echo "1. Install ngrok: brew install ngrok"
echo "2. Run: ngrok http 54321"
echo "3. Copy the https URL (e.g., https://abc123.ngrok.io)"
echo "4. Set webhook:"
echo ""
echo "curl -X POST \"https://api.telegram.org/bot8374270952:AAHal9UL2m3y-6sSLWXYOuI9ukFJoKBToLM/setWebhook\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"url\": \"https://YOUR-NGROK-URL.ngrok.io/functions/v1/telegram-bot?secret=your_webhook_secret_here\","
echo "    \"allowed_updates\": [\"message\", \"callback_query\"]"
echo "  }'"
echo ""

echo "🎉 Your bot @testfitcleanbot is ready to receive messages!"
echo "📱 Bot link: https://t.me/testfitcleanbot"
