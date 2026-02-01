# Telegram Bot Setup Guide

This guide walks you through setting up Lumen as a Telegram bot.

## Prerequisites

- A Telegram account
- Your Lumenfriend server running and accessible at `https://lumenfriend.codenlighten.org`
- A terminal or API tool (curl, Postman, etc.)

## Step 1: Create a Bot with @BotFather

1. Open Telegram and search for **@BotFather**
2. Start the chat and send `/newbot`
3. Follow the prompts to name your bot:
   - **Friendly name**: e.g., "Lumen" or "My Lumen Bot"
   - **Username**: e.g., `lumen_smartledger_bot` (must end with `_bot`)
4. BotFather will return a **bot token** like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
5. Save this token safely

## Step 2: Configure the Bot Token

1. Open your `.env` file in lumenfriend
2. Add your bot token:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   ```
3. Restart the server: `npm start`

## Step 3: Register the Webhook

Call the registration endpoint with your server's webhook URL:

```bash
curl -X POST https://lumenfriend.codenlighten.org/api/telegram/register \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://lumenfriend.codenlighten.org/api/telegram/webhook"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Webhook registered successfully",
  "result": { "ok": true, "description": "Webhook was set" }
}
```

## Step 4: Verify the Bot

Check the bot status:

```bash
curl https://lumenfriend.codenlighten.org/api/telegram/status
```

Should return bot info and webhook status.

## Step 5: Test the Bot

1. Search for your bot in Telegram by its username (e.g., `@lumen_smartledger_bot`)
2. Send `/start` to see the welcome message
3. Try a regular message like "Hello"
4. Test commands:
   - `/memory` - Toggle memory on/off
   - `/reset` - Clear conversation history
   - `/help` - Show available commands

## Features

✅ **Persistent Memory**: Each user gets a separate session with history
✅ **Personality Evolution**: Lumen evolves based on interactions
✅ **Response Chaining**: Long responses are automatically assembled
✅ **Markdown Support**: **Bold**, _italic_, `code` formatting works
✅ **Code Blocks**: Syntax-highlighted code displays properly
✅ **Message Splitting**: Long responses split across multiple messages automatically

## Troubleshooting

### Bot not responding
- Check that `TELEGRAM_BOT_TOKEN` is set correctly in `.env`
- Verify webhook is registered: `curl https://lumenfriend.codenlighten.org/api/telegram/status`
- Check server logs for errors

### Webhook registration failed
- Ensure your server is publicly accessible at `https://lumenfriend.codenlighten.org`
- Use HTTPS only (not HTTP)
- Verify the URL is exactly correct in the registration call

### Messages not appearing
- Check that Telegram API key is valid
- Ensure webhook URL matches exactly
- Review server logs for API errors

## Advanced: Re-register or Disable Webhook

To change the webhook URL:
```bash
curl -X POST https://lumenfriend.codenlighten.org/api/telegram/register \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-new-url.com/api/telegram/webhook"}'
```

To disable the bot (optional):
```bash
# From @BotFather, send /deletebot and select your bot
```

## Support

For issues, check:
- Server logs: `tail -f logs/error.log`
- Telegram webhook status endpoint
- OpenAI API key validity
- Network connectivity to Telegram API
