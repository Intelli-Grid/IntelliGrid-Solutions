// Backend/scripts/registerTelegramWebhook.js
// Run once after every Railway deployment:
//   node scripts/registerTelegramWebhook.js
import 'dotenv/config'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const BACKEND_URL = process.env.BACKEND_URL || 'https://backend.intelligrid.online'
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env')
  process.exit(1)
}

if (!SECRET) {
  console.warn('⚠️  TELEGRAM_WEBHOOK_SECRET not set — webhook will be registered without secret validation')
}

const webhookUrl = `${BACKEND_URL}/api/v1/telegram/webhook`

console.log(`🔗 Registering webhook: ${webhookUrl}`)

const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: SECRET,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  }),
})

const data = await response.json()

if (data.ok) {
  console.log(`✅ Webhook registered successfully: ${webhookUrl}`)
  console.log(`   Secret token: ${SECRET ? '***set***' : 'NOT SET'}`)
} else {
  console.error(`❌ Failed to register webhook: ${data.description}`)
  process.exit(1)
}
