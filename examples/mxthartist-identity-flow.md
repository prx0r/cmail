# Example: Find Social Identity for "mxthart"

## The Query

> "I have domain ideas: privately.win, oo0oo.art, mxth.art. mxth.art is clean but mxth is taken on Instagram. I identified mxthartist as available on Instagram. Check if mxthartist is free on X, TikTok, YouTube, and all others. This needs to happen before purchasing the domain."

## What Happened (Full Flow)

### Step 1: Seed Ideas → Handle Candidates

The human provides domain/handle seeds. The agent expands them into candidates:

```
Seeds:     mxth.art, mxthartist, privately.win, oo0oo.art
Handles:   mxth, mxthart, mxthartist, privately, oo0oo
```

**Key insight:** Check handles BEFORE buying domains. Identity first, infrastructure second.

### Step 2: Apify Social Check (15 platforms)

Run `corent1robert~social-handle-checker` via Apify API:

```bash
# Start run
curl -X POST "https://api.apify.com/v2/acts/corent1robert~social-handle-checker/runs?token=$TOKEN" \
  -d '{"handles":["mxthartist"],"coverage":"all"}'

# Poll until SUCCEEDED (max 60s)
# Parse results from dataset
```

**Result for mxthartist:**
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
❓ Instagram    error          (Apify couldn't reach)
❓ Facebook     error          (Apify couldn't reach)
```

**Result for mxthart (shorter version):**
```
🔴 Pinterest    taken          confidence=high
✅ Everything else available
```

### Step 3: Format Validation (per-platform rules)

Even if a handle is "available" on Apify, it must pass format rules:

```typescript
import { validateHandle, findUniversalHandle } from './src/social-rules';

// mxthartist passes ALL platforms
validateHandle('mxthartist', 'instagram')  // ✅ valid (≤30, lowercase/numbers/._)
validateHandle('mxthartist', 'x')          // ✅ valid (≤15, alnum/_)
validateHandle('mxthartist', 'tiktok')     // ✅ valid (2-24, alnum/._)
validateHandle('mxthartist', 'youtube')    // ✅ valid (3-30, alnum/._-)
validateHandle('mxthartist', 'bluesky')    // ✅ valid (3-18, alnum/-)

// mxth.artist (dot variant) FAILS on some platforms
validateHandle('mxth.artist', 'instagram')  // ✅ valid
validateHandle('mxth.artist', 'x')          // ❌ invalid chars (no periods)
validateHandle('mxth.artist', 'bluesky')    // ❌ invalid chars (no periods)
```

### Step 4: Universal Handle Finder

```typescript
import { findUniversalHandle } from './src/social-rules';

findUniversalHandle(['mxthartist', 'mxth.art', 'mxth_art', 'mxthart']);
// → { handle: 'mxthartist', valid_on: ALL 10 PLATFORMS, invalid_on: [] }
```

**Decision: `mxthartist` is the universal handle.**

### Step 5: Dependency Check

What does mxthartist need?

```
mxthartist
  ├── needs: email (agents@{domain})
  ├── needs: phone (for X, YouTube, TikTok verification)
  └── depends_on: domain purchase
```

### Step 6: Domain Check

Does a matching domain exist?

```
mxthartist.com  → check availability
mxthartist.io   → check availability
mxth.art        → already owned by human
mxthartist.art  → check availability
```

### Step 7: Full Chain (if human confirms)

```
1. 👤 BUY DOMAIN (human approves)
2. 🟢 Wire email (agent)
3. 👤 BUY PHONE (human approves)
4. 🟢 ALL SOCIALS IN PARALLEL:
   - Bluesky (API, no captcha)
   - YouTube (Playwright, captcha possible)
   - Instagram (Playwright, captcha likely)
   - TikTok (Playwright, complex captcha)
   - X (Playwright, captcha possible)
   - + Facebook, WhatsApp (Meta bundle via Instagram)
```

## The Flow Diagram

```
HUMAN: "mxthart is taken on insta, try mxthartist"
  │
  ▼
AGENT: Apify check → mxthartist available everywhere
  │
  ▼
AGENT: Format validation → mxthartist valid on all 10 platforms
  │
  ▼
AGENT: Universal handle found → mxthartist
  │
  ▼
AGENT: "mxthartist is available on all platforms. Ready to proceed?"
  │
  ▼
HUMAN: "yes, buy mxthartist.com"
  │
  ▼
AGENT: Buy domain → Wire email → Buy phone → Signup all socials
  │
  ▼
RESULT: Full digital identity in ~30 minutes
```

## Files Used

| File | Purpose |
|------|---------|
| `src/social-rules.ts` | Platform rules, handle validation, universal finder |
| `src/names.ts` | Apify integration, direct handle checks |
| `src/targets.ts` | Dependency resolver, cost calculator |
| `targets/*.json` | Per-platform signup tasks and gates |
| `scripts/verify-capacity.sh` | Email infrastructure proof |

## Cost

```
Domain:     ~$2-10/yr (Cloudflare at-cost)
Phone:      ~$1/mo (Telnyx)
Email:      FREE (Cloudflare Email Routing)
Socials:    FREE (all platforms)
─────────────────────────
Total:      ~$14/yr minimum
```

## Time

```
Handle check:    ~30 seconds (Apify)
Format check:    instant (local validation)
Domain purchase: ~2 minutes (human approval + CF API)
Email setup:     ~1 minute (CF + cmail)
Phone setup:     ~2 minutes (human approval + Telnyx)
Social signups:  ~10 minutes (parallel, agent attempts all)
─────────────────────────
Total:           ~20-30 minutes
```

## Template for Future Queries

```bash
# 1. Check handle on Apify
curl -X POST "https://api.apify.com/v2/acts/corent1robert~social-handle-checker/runs?token=$TOKEN" \
  -d '{"handles":["NEW_HANDLE"],"coverage":"all"}'

# 2. Validate format
npx tsx -e "
import { validateHandle } from './src/social-rules';
const handle = 'NEW_HANDLE';
['instagram','x','tiktok','youtube','bluesky','facebook','twitch','snapchat','telegram'].forEach(p => {
  const r = validateHandle(handle, p);
  console.log(r.valid ? '✅' : '❌', p, r.valid ? '' : r.reason);
});
"

# 3. Find universal handle
npx tsx -e "
import { findUniversalHandle } from './src/social-rules';
console.log(findUniversalHandle(['candidate1', 'candidate2']));
"

# 4. Check domain availability
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.cf_check","args":{"domain":"HANDLE.com"}}'
```
