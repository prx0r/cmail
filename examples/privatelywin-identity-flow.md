# Example: Find Social Identity for "privatelywin"

## The Query

> "I'm thinking of getting privately.win and then privatelywin across socials. Check for me."

## Results

### Step 1: Apify Social Check (15 platforms)

```
🟢 Bluesky      available=yes  confidence=high
🟢 GitHub       available=yes  confidence=high
🟢 GitLab       available=yes  confidence=high
🟢 Pinterest    available=yes  confidence=high
🟢 Snapchat     available=yes  confidence=high
🟢 SoundCloud   available=yes  confidence=high
🟢 Telegram     available=yes  confidence=high
🟢 TikTok       available=yes  confidence=high
🟢 Twitch       available=yes  confidence=low
🟢 X            available=yes  confidence=high
🟢 YouTube      available=yes  confidence=high
❓ Facebook     error (Apify unreachable)
❓ Instagram    error (Apify unreachable)
❓ Reddit       error (Apify unreachable)
❓ Threads      error (Apify unreachable)
```

**Summary:** 11 available, 0 taken, 4 unknown (Apify errors, not taken signals)

### Step 2: Format Validation

```
🟢 Instagram      VALID  (≤30, lowercase/numbers/._)
🟢 X              VALID  (≤15, alnum/_)
🟢 TikTok         VALID  (2-24, alnum/._)
🟢 YouTube        VALID  (3-30, alnum/._-)
🟢 Bluesky        VALID  (3-18, alnum/-)
🟢 Facebook       VALID  (≤50, alnum/.)
🟢 WhatsApp       VALID  (≤25, alnum/ .-)
🟢 Twitch         VALID  (4-25, alnum/_)
🟢 Snapchat       VALID  (3-15, alnum/_-)
🟢 Telegram       VALID  (5-32, alnum/_)
```

**Summary:** 10/10 platforms accept `privatelywin`

### Step 3: Domain Check

```
🟢 privately.win — available ($4.18 USD/yr on Cloudflare)
```

## The Decision

| Item | Choice |
|------|--------|
| Domain | `privately.win` ($4.18/yr) |
| Handle | `privatelywin` |
| Email | `agents@privately.win` |
| All socials | `privatelywin` |

## Why This Works

- **12 chars** — fits X's 15-char limit (the tightest)
- **All alphanumeric** — no special chars needed
- **No conflicts** — 0 platforms report taken
- **Clean** — no dots, hyphens, or underscores to remember
- **Domain matches** — `privately.win` + `privatelywin` = consistent brand

## Cost

```
Domain:  $4.18/yr  (privately.win on Cloudflare)
Phone:   $1.00/mo  (for X, YouTube, TikTok SMS verification)
Email:   FREE      (Cloudflare Email Routing)
Socials: FREE      (all platforms)
─────────────────────
Total:   ~$16/yr
```

## Chain (if confirmed)

```
1. 👤 BUY privately.win ($4.18/yr)
2. 🟢 Wire email → agents@privately.win
3. 👤 BUY phone (~$1/mo)
4. 🟢 ALL SOCIALS (parallel):
   - Bluesky    (API, no captcha)
   - YouTube    (Google signup)
   - Instagram  (Meta signup → unlocks Facebook + WhatsApp)
   - TikTok     (complex captcha)
   - X          (phone verify)
   - + Snapchat, Telegram, Twitch, etc.
```

## Command

```bash
bash scripts/check-identity.sh privatelywin privately.win
```
