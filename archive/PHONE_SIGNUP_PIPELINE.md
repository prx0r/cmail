# Phone + Social Signup Pipeline — Ready to Go

## Prerequisites
1. Telnyx account verified (Level 2 for international numbers)
2. UK or US phone number purchased via Telnyx
3. Email already set up (egoic.ai or intelligentothers.xyz → cmail)

## Step 1: Buy Phone Number (when verified)

### UK Number
```bash
# Search for UK SMS numbers
curl -X GET "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=GB&filter[features]=sms" \
  -H "Authorization: Bearer $TELNYX_KEY"

# Purchase
curl -X POST "https://api.telnyx.com/v2/number_orders" \
  -H "Authorization: Bearer $TELNYX_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone_numbers": [{"phone_number": "+44745XXXXXXX"}]}'
```

### US Number (might work without verification)
```bash
curl -X POST "https://api.telnyx.com/v2/number_orders" \
  -H "Authorization: Bearer $TELNYX_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone_numbers": [{"phone_number": "+16813XXXXXXX"}]}'
```

## Step 2: Set Up SMS Webhook

```bash
# Create webhook endpoint on steve
curl -X POST "https://api.telnyx.com/v2/call_control_applications" \
  -H "Authorization: Bearer $TELNYX_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_event_url": "https://steve.intelligentothers.xyz/api/backend/telnyx/sms-webhook",
    "webhook_failover_url": "https://steve.intelligentothers.xyz/api/backend/telnyx/sms-webhook"
  }'
```

## Step 3: Social Signup Flow

For each platform, the agent:
1. Opens signup page
2. Enters email (hello@egoic.ai)
3. Enters phone number (UK/US Telnyx number)
4. Receives SMS verification code via steve webhook
5. Enters code
6. Account created

### Easy Platforms (no CAPTCHA)
| Platform | URL | Email | Phone | SMS |
|----------|-----|-------|-------|-----|
| GitHub | github.com/signup | ✅ | ❌ | ❌ |
| npm | npmjs.com/signup | ✅ | ❌ | ❌ |
| Bluesky | bsky.app | ✅ | ❌ | ❌ |
| GitLab | gitlab.com/signup | ✅ | ❌ | ❌ |
| SoundCloud | soundcloud.com | ✅ | ❌ | ❌ |

### Medium Platforms (may need phone)
| Platform | URL | Email | Phone | SMS |
|----------|-----|-------|-------|-----|
| X | x.com/i/flow/signup | ✅ | ✅ | ✅ |
| YouTube | youtube.com | ✅ | ✅ | ✅ |
| Pinterest | pinterest.com/signup | ✅ | ✅ | ✅ |

### Hard Platforms (heavy CAPTCHA)
| Platform | URL | Email | Phone | SMS |
|----------|-----|-------|-------|-----|
| TikTok | tiktok.com/signup | ✅ | ✅ | ✅ |
| Snapchat | snapchat.com/signup | ✅ | ✅ | ✅ |

## Step 4: WhatsApp Business (sparky)

### Setup
1. Go to Telnyx Portal → Messaging → WhatsApp
2. Connect Meta Business Manager
3. Verify phone number
4. Create message templates
5. Start sending/receiving

### Use Case for Sparky
- Customer messages WhatsApp → steve creates job
- Send quotes via WhatsApp (90%+ open rate)
- Appointment reminders
- Two-way chat

## MCP Recipes

### Recipe 1: Check + Buy + Wire
```bash
# Check
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.search","args":{"name":"postagi"}}'

# Buy
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.cf_purchase","args":{"domain":"postagi.trade","confirmed":true}}'

# Wire email
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.wire_email","args":{"domain":"postagi.trade","confirmed":true}}'
```

### Recipe 2: Social Signup
```bash
# Check what's available
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.social","args":{"name":"postagi"}}'

# Read OTP emails
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"email.search","args":{"q":"verification"}}'

# Read SMS codes
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.read_sms","args":{"to":"+44745XXXXXXX"}}'
```

### Recipe 3: WhatsApp for Sparky
```bash
# Send WhatsApp message
curl -X POST "https://api.telnyx.com/v2/messages/whatsapp" \
  -H "Authorization: Bearer $TELNYX_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+44745XXXXXXX",
    "to": "+855XXXXXXXX",
    "whatsapp_message": {
      "type": "text",
      "text": {"body": "Hi! Your quote is ready."}
    }
  }'
```

## What's Ready Now
- ✅ Domain check + purchase (Cloudflare Registrar)
- ✅ Email routing (Cloudflare Email Routing)
- ✅ Social handle checking (13 platforms)
- ✅ MCP tools (23 total)
- ✅ Phone search (Telnyx)

## What's Waiting on Verification
- ⏸️ UK number purchase
- ⏸️ US number purchase (might work without verification)
- ⏸️ SMS webhook setup
- ⏸️ WhatsApp Business setup
- ⏸️ Social signup automation
