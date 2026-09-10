# GOAL: Autonomous Name Acquisition Pipeline

## Vision
An agent discovers a name (e.g. "postagi"), checks availability across domains + socials,
autonomously purchases the domain, sets up email, uses that email to sign up for each
social account, provisions a Telnyx phone number, and uses it to receive/enter SMS
verification codes. End-to-end brand establishment with zero human intervention.

## Flow
```
1. CHECK     → Is postagi.trade available? postagi on GitHub? X? IG? TikTok? npm?
2. DECIDE    → Rank options, pick best domain TLD, confirm plan
3. BUY       → Purchase domain on Cloudflare (real money, needs confirmation)
4. WIRE      → Email Routing → cmail worker (hello@, support@, agents@ live)
5. PHONE     → Provision Telnyx number, receive SMS
6. SIGNUP    → Use email + phone to create accounts on each platform
7. VERIFY    → Receive SMS codes via Telnyx, enter them, complete verification
8. CONFIRM   → Report back: name secured everywhere
```

## Checkpoints

### CP1: Evidence of Availability (CURRENT)
- Domain availability check (DNS + RDAP) for a given name across TLDs
- Handle check across social platforms (GitHub, X, Instagram, TikTok, etc.)
- Return honest 5-state verdicts: taken / available / not_found / invalid / unknown
- MCP tool so agents can call it

### CP2: Domain Purchase via Cloudflare
- Use Cloudflare Registrar API to buy a domain
- Real money flow with human confirmation gate
- Receipt stored in D1/R2
- MCP tool: `domain.purchase`

### CP3: Email Routing Setup
- After purchase, create Cloudflare zone + nameservers
- Enable Email Routing → cmail worker
- Create hello@, support@, billing@, agents@ mailboxes
- MCP tool: `domain.wire_email`

### CP4: Telnyx Phone Provisioning
- Create Telnyx account/API key
- Provision a phone number in desired area code
- Set up webhook to receive incoming SMS
- MCP tool: `phone.provision`

### CP5: SMS Verification Relay
- Receive SMS from platform (e.g. Instagram sends code to Telnyx number)
- Forward SMS content to agent via webhook/MCP
- Agent enters the code on the platform
- MCP tool: `phone.read_sms`

### CP6: Social Account Signup (Autonomous)
- Agent uses email + phone to sign up for GitHub, X, Instagram, TikTok, npm
- Handles SMS verification via Telnyx relay
- Stores credentials encrypted in steve's vault
- Reports: account created, handle secured
- MCP tool: `social.signup`

### CP7: Full Pipeline Demo
- End-to-end: "postagi" → domain bought → email live → accounts created → verified
- Demo with real money (cheap domain like .trade or .xyz)
- Output: report of all secured assets
