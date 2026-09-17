#!/usr/bin/env bash
# check-identity.sh — Quick identity check for a handle
# Usage: ./check-identity.sh <handle> [domain]
# Runs Apify check + format validation + domain check
set -euo pipefail

HANDLE="${1:?usage: $0 <handle> [domain]}"
DOMAIN="${2:-}"
TOKEN=$(agent-vault vault credential get APIFY_TOKEN --vault oracle 2>/dev/null | tail -1)

echo "╔══════════════════════════════════════════════════════╗"
echo "║  IDENTITY CHECK: $HANDLE"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Apify social check ─────────────────────────────
echo "STEP 1: Apify social check..."
START_RESP=$(curl -sf -X POST "https://api.apify.com/v2/acts/corent1robert~social-handle-checker/runs?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"handle\":\"$HANDLE\",\"coverage\":\"all\"}" 2>/dev/null)
RUN_ID=$(echo "$START_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

if [ -n "$RUN_ID" ]; then
  for i in $(seq 1 20); do
    sleep 3
    STATUS_RESP=$(curl -sf "https://api.apify.com/v2/acts/corent1robert~social-handle-checker/runs/$RUN_ID?token=$TOKEN" 2>/dev/null)
    STATUS=$(echo "$STATUS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('status',''))" 2>/dev/null)
    if [ "$STATUS" = "SUCCEEDED" ]; then
      DS_ID=$(echo "$STATUS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('defaultDatasetId',''))" 2>/dev/null)
      curl -sf "https://api.apify.com/v2/datasets/$DS_ID/items?token=$TOKEN" | python3 -c "
import sys, json
items = json.load(sys.stdin)
if items:
    row = items[0]
    platforms = {
        'instagram': 'Instagram', 'tiktok': 'TikTok', 'twitter': 'X',
        'youtube': 'YouTube', 'facebook': 'Facebook', 'bluesky': 'Bluesky',
        'twitch': 'Twitch', 'snapchat': 'Snapchat', 'telegram': 'Telegram',
        'github': 'GitHub', 'gitlab': 'GitLab', 'soundcloud': 'SoundCloud',
        'pinterest': 'Pinterest', 'reddit': 'Reddit', 'threads': 'Threads'
    }
    print('Apify Results:')
    avail = 0
    taken = 0
    for key, label in sorted(platforms.items()):
        val = row.get(f'available_{key}', '?')
        conf = row.get(f'confidence_{key}', '?')
        icon = '🟢' if val == 'yes' else '🔴' if val == 'no' else '❓'
        if val == 'yes': avail += 1
        elif val == 'no': taken += 1
        print(f'  {icon} {label:15} {val:6}  ({conf})')
    print(f'  Summary: {avail} available, {taken} taken, {15-avail-taken} unknown')
"
      break
    fi
    if [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "ABORTED" ]; then
      echo "  Apify run failed"
      break
    fi
  done
else
  echo "  Failed to start Apify run"
fi

echo ""

# ─── Step 2: Format validation ──────────────────────────────
echo "STEP 2: Format validation..."
cd "$(dirname "$0")/.." 2>/dev/null || cd /root/cmail
npx tsx -e "
import { validateHandle } from './src/social-rules';
const handle = '$HANDLE';
const platforms = ['instagram','x','tiktok','youtube','bluesky','facebook','whatsapp','twitch','snapchat','telegram'];
let valid = 0;
let invalid = 0;
for (const p of platforms) {
  const r = validateHandle(handle, p);
  if (r.valid) { valid++; console.log('  🟢 ' + p.padEnd(20) + 'VALID'); }
  else { invalid++; console.log('  🔴 ' + p.padEnd(20) + r.reason); }
}
console.log('  Summary: ' + valid + '/' + platforms.length + ' platforms accept this format');
" 2>/dev/null

echo ""

# ─── Step 3: Domain check ───────────────────────────────────
if [ -n "$DOMAIN" ]; then
  echo "STEP 3: Domain check..."
  TLD=$(echo "$DOMAIN" | awk -F. '{print $NF}')
  curl -sf -X POST https://cmail.tradesprior.workers.dev/mcp \
    -H "Content-Type: application/json" \
    -d "{\"tool\":\"name.cf_check\",\"args\":{\"domain\":\"$DOMAIN\"}}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('registrable'):
    print(f'  🟢 {\"$DOMAIN\"} — available (\${d.get(\"price\",\"?\")} {d.get(\"currency\",\"USD\")}/yr)')
else:
    print(f'  🔴 {\"$DOMAIN\"} — {d.get(\"reason\",\"taken\")}')
" 2>/dev/null
else
  echo "STEP 3: Domain check (skipped — no domain provided)"
  echo "  Tip: try $HANDLE.com, $HANDLE.art, $HANDLE.io"
fi

echo ""
echo "DONE"
