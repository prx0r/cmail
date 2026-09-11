# Autonomous Social Signup — How It Works

## The Problem
Each platform requires:
1. Email address (for verification)
2. Phone number (for SMS verification on some platforms)
3. Browser automation (to fill forms, handle CAPTCHAs)
4. SMS relay (to receive verification codes)

## The Flow
```
1. BUY domain       → hamtask.com via Cloudflare ($10.46)
2. WIRE email       → hello@hamtask.com → cmail worker
3. CREATE temp email → agent generates OTP code from cmail
4. GET phone number  → Telnyx provision number
5. SIGN UP           → Playwright fills signup form
6. VERIFY EMAIL      → cmail receives OTP, agent reads it
7. VERIFY PHONE      → Telnyx receives SMS, agent reads it
8. REPEAT            → for each platform
```

## Platform Signup Requirements

| Platform | Email | Phone | CAPTCHA | Difficulty |
|----------|-------|-------|---------|------------|
| GitHub | ✅ | ❌ | ❌ | Easy |
| X | ✅ | ✅ | ✅ | Medium |
| YouTube | ✅ | ✅ | ✅ | Medium |
| TikTok | ✅ | ✅ | ✅ | Hard |
| npm | ✅ | ❌ | ❌ | Easy |
| PyPI | ✅ | ❌ | ❌ | Easy (via GitHub) |
| Bluesky | ✅ | ❌ | ❌ | Easy |
| Telegram | ✅ | ✅ | ❌ | Easy |
| GitLab | ✅ | ❌ | ❌ | Easy |
| Snapchat | ✅ | ✅ | ✅ | Hard |
| SoundCloud | ✅ | ❌ | ❌ | Easy |
| Pinterest | ✅ | ✅ | ✅ | Medium |

## Automation Tools

| Tool | What It Does | Cost |
|------|-------------|------|
| **Playwright** | Browser automation (fill forms, click buttons) | Free |
| **cmail MCP** | Receive OTP emails, read verification codes | Free |
| **Telnyx** | Provision phone number, receive SMS | ~$1/mo + $0.01/SMS |
| **Apify** | Account creation actors (some platforms) | $0.006/handle |

## Per-Platform Signup Steps

### GitHub (EASY)
1. Go to `github.com/signup`
2. Fill: email, password, username (`hamtask`)
3. Solve CAPTCHA (if any)
4. Verify email via cmail
5. Done — no phone needed

### npm (EASY)
1. Go to `npmjs.com/signup`
2. Fill: email, password, username (`hamtask`)
3. Verify email via cmail
4. Done — no phone needed

### Bluesky (EASY)
1. Go to `bsky.app` or use API
2. Fill: email, password, handle (`hamtask.bsky.social`)
3. Done — no phone, no CAPTCHA

### Telegram (EASY)
1. Go to `web.telegram.org`
2. Fill: phone number (Telnyx)
3. Receive SMS code via Telnyx
4. Enter code
5. Done — no email needed

### GitLab (EASY)
1. Go to `gitlab.com/users/sign_up`
2. Fill: email, password, username (`hamtask`)
3. Verify email via cmail
4. Done — no phone needed

### SoundCloud (EASY)
1. Go to `soundcloud.com`
2. Fill: email, password, display name
3. Verify email via cmail
4. Done — no phone needed

### X/Twitter (MEDIUM)
1. Go to `x.com/i/flow/signup`
2. Fill: name, email/phone
3. Verify email/phone
4. Fill: password, username (`hamtask`)
5. May require phone verification
6. CAPTCHA sometimes required

### YouTube (MEDIUM)
1. Sign in with Google account
2. Create channel with name `hamtask`
3. May require phone verification for channel creation

### Pinterest (MEDIUM)
1. Go to `pinterest.com/signup`
2. Fill: email, password, age
3. Verify email via cmail
4. May require phone verification

### TikTok (HARD)
1. Go to `tiktok.com/signup`
2. Fill: birthday, email/phone
3. Verify email/phone
4. Fill: password, username (`hamtask`)
5. Heavy CAPTCHA (slider, puzzle)
6. May block automated browsers

### Snapchat (HARD)
1. Go to `snapchat.com/signup`
2. Fill: email, password, birthday, username (`hamtask`)
3. May require phone verification
4. Heavy bot detection
