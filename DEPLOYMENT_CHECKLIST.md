# Deployment Checklist: Telegram Bot Integration

## Pre-Deployment Verification ✅
- [x] All Telegram files created (telegramBot.js, telegramSessionManager.js)
- [x] Server endpoints added (/api/telegram/webhook, /api/telegram/register, /api/telegram/status)
- [x] Response chaining integrated
- [x] Session storage configured
- [x] Documentation complete (API.md, TELEGRAM_SETUP.md, TELEGRAM_IMPLEMENTATION.md)
- [x] Deployment tarball created (lumenfriend-deploy.tar.gz - 93KB)
- [x] Server starts without errors with Telegram integration
- [x] All imports resolve correctly

## File Manifest (Included in Tarball)

### Core Telegram Files
- `lib/telegramBot.js` (290 lines)
- `lib/telegramSessionManager.js` (195 lines)

### Updated Existing Files
- `server.js` (+130 lines for Telegram endpoints)
- `.env` (+ TELEGRAM_BOT_TOKEN variable)
- `API.md` (+60 lines Telegram documentation)
- `STATUS.md` (updated with Telegram status)

### Documentation
- `TELEGRAM_SETUP.md` (150+ lines setup guide)
- `TELEGRAM_IMPLEMENTATION.md` (technical reference)

## Deployment Steps

### Step 1: Upload Tarball to Production
```bash
# Copy tarball to production server
scp lumenfriend-deploy.tar.gz [user@server]:/home/deploy/

# Extract on production
ssh [user@server]
cd /home/deploy
tar -xzf lumenfriend-deploy.tar.gz
cd lumenfriend
npm install  # (if needed)
```

### Step 2: Create Telegram Bot with BotFather
```
1. Message @BotFather on Telegram
2. Send /newbot
3. Choose a name (e.g., "Lumen Friend Bot")
4. Choose a username (e.g., "@lumenfriendbot")
5. Copy the token provided
```

**Token Format:** `123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh`

### Step 3: Configure Environment Variable
```bash
# Edit .env on production server
nano .env

# Add the token:
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
```

### Step 4: Restart Server
```bash
pm2 restart lumenfriend
# OR
npm start
```

**Verify:** Server logs should show:
```
Server listening on port 3000
Telegram bot integration enabled
```

### Step 5: Register Webhook with Telegram
```bash
curl -X POST https://lumenfriend.codenlighten.org/api/telegram/register \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://lumenfriend.codenlighten.org/api/telegram/webhook"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### Step 6: Verify Webhook Status
```bash
curl https://lumenfriend.codenlighten.org/api/telegram/status
```

**Expected Response:**
```json
{
  "status": "ok",
  "webhook": {
    "url": "https://lumenfriend.codenlighten.org/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  },
  "botInfo": {
    "id": 7123456789,
    "is_bot": true,
    "first_name": "Lumen",
    "username": "lumenfriendbot",
    "can_join_groups": false,
    "can_read_all_group_messages": false,
    "supports_inline_queries": false
  }
}
```

### Step 7: Test the Bot
```bash
# In Telegram, find @lumenfriendbot (or your chosen username)
1. Send /start
   → Expect: Welcome message with feature list
2. Send a regular message (e.g., "Hello")
   → Expect: Response from Lumen with personality context
3. Send /memory
   → Expect: Toggle message, memory mode changed
4. Send /reset
   → Expect: History cleared confirmation
5. Send /help
   → Expect: Command guide
```

## Rollback Plan

If issues occur:

### Option 1: Quick Rollback
```bash
cd /home/deploy/lumenfriend
git checkout server.js lib/
npm start
```

### Option 2: Remove Telegram Webhook
```bash
curl -X POST https://api.telegram.org/bot[TOKEN]/deleteWebhook
```

This disables the bot immediately without affecting other endpoints.

### Option 3: Disable Telegram Integration
```bash
# Edit .env and comment out TELEGRAM_BOT_TOKEN
nano .env
# TELEGRAM_BOT_TOKEN=...  # (commented out)

npm start
```

## Monitoring After Deployment

### Health Checks
```bash
# Check all endpoints
curl https://lumenfriend.codenlighten.org/health
curl https://lumenfriend.codenlighten.org/api/telegram/status
curl https://lumenfriend.codenlighten.org/api/lumen -X POST -d '{"query":"test"}'
```

### Log Monitoring
```bash
# Watch server logs
pm2 logs lumenfriend

# Look for:
# - Successful Telegram updates received
# - Response chaining iterations
# - Session saves
# - Any errors from OpenAI API
```

### Expected Log Output
```
Server listening on port 3000
Telegram bot integration enabled
✅ Telegram webhook: POST /api/telegram/webhook (received message from user 12345)
  └─ Response: 2 continuations, 87 total chars
  └─ Sent 1 message(s) to Telegram API
  └─ Session saved: sessions/telegram/12345.json
```

## Performance Notes

### Resource Usage
- Per-user session: ~2-5 KB (growth with conversation history)
- Typical response time: 2-5 seconds (OpenAI API latency)
- Memory overhead: Minimal (sessions loaded on-demand, unloaded after response)

### Scaling Considerations
- Sessions directory will grow (~1 KB per 100 interactions)
- Telegram API rate limits: ~30 messages/second per bot
- OpenAI API rate limit: Check with your account tier

### Session Cleanup (Optional)
To periodically clean old sessions:
```bash
# Remove sessions older than 30 days
find sessions/telegram -mtime +30 -delete
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Webhook not registering** | Verify domain is publicly accessible, use /api/telegram/status to check |
| **No responses from bot** | Check TELEGRAM_BOT_TOKEN in .env, verify webhook URL is correct, check server logs |
| **Message formatting broken** | Check that MarkdownV2 escaping is working; see lib/telegramBot.js escapeMarkdownV2() |
| **Long messages split incorrectly** | Verify message chunking logic in formatTelegramResponse(); should split at 4096 chars |
| **Sessions not persisting** | Check permissions on sessions/telegram/ directory, verify disk space available |
| **Response chaining not working** | Check that response chaining is enabled; verify `continuationHitLimit` in response |

## Post-Deployment Monitoring

### Daily Check
```bash
# Verify bot is still responding
curl -X GET https://lumenfriend.codenlighten.org/api/telegram/status | grep "url"
```

### Weekly Review
```bash
# Check session storage growth
du -sh sessions/telegram/

# Look for errors in logs
grep -i error /var/log/[your-app].log | tail -20
```

### Monthly Maintenance
```bash
# Clean up old sessions (if applicable)
find sessions/telegram -mtime +90 -delete

# Archive/backup sessions
tar -czf sessions-backup-$(date +%Y%m%d).tar.gz sessions/telegram/
```

---

**Ready to Deploy?** ✅

All files are in `lumenfriend-deploy.tar.gz`. Follow the steps above to activate the Telegram bot on your production instance.

**Questions?** Refer to:
- `TELEGRAM_SETUP.md` - Step-by-step user setup
- `TELEGRAM_IMPLEMENTATION.md` - Technical architecture
- `API.md` - Endpoint specifications
