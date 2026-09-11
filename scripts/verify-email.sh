#!/usr/bin/env bash
# verify-email.sh — EVP-1 layers 1-7 (automated) + round-trip poll.
# Usage:
#   CLOUDFLARE_API_TOKEN=... ./scripts/verify-email.sh check <domain> <address>
#   ./scripts/verify-email.sh roundtrip <mailbox> <token> [timeout_s]
# Exit 0 only on full pass. Writes evidence bundle to receipts/email-verify/.
set -u
MCP="https://cmail.tradesprior.workers.dev/mcp"
OUTDIR="receipts/email-verify"
DOMAIN="${2:-}"; ADDR="${3:-}"

fail=0
say() { printf '%s\n' "$*"; }
pass() { say "PASS layer $1: $2"; }
miss() { say "FAIL layer $1: $2"; fail=1; }

if [ "${1:-}" = "check" ]; then
  [ -z "$DOMAIN" ] && { echo "usage: $0 check <domain> <address>"; exit 2; }
  TS=$(date -u +%Y%m%dT%H%M%SZ)
  DEST="$OUTDIR/$DOMAIN/${ADDR:-none}/$TS"
  mkdir -p "$DEST"

  # L1 MX
  MX=$(dig +short MX "$DOMAIN" 2>/dev/null)
  echo "$MX" > "$DEST/l1_mx.txt"
  if [ -n "$MX" ]; then pass 1 "MX -> $(echo "$MX" | head -n1)"; else miss 1 "no MX records for $DOMAIN"; fi

  # L2 SPF
  SPF=$(dig +short TXT "$DOMAIN" 2>/dev/null | grep -i "v=spf1" || true)
  echo "$SPF" > "$DEST/l2_spf.txt"
  if [ -n "$SPF" ]; then pass 2 "SPF present"; else miss 2 "no SPF TXT on $DOMAIN"; fi

  # L3 DMARC
  DMARC=$(dig +short TXT "_dmarc.$DOMAIN" 2>/dev/null || true)
  echo "$DMARC" > "$DEST/l3_dmarc.txt"
  if [ -n "$DMARC" ]; then pass 3 "DMARC present"; else miss 3 "no DMARC on $DOMAIN"; fi

  # L4 zone
  ZONE=$(curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN:-}" \
    "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); r=(d.get('result') or [{}])[0]; print(r.get('id',''), r.get('status',''))")
  echo "$ZONE" > "$DEST/l4_zone.txt"
  ZID=$(echo "$ZONE" | awk '{print $1}'); ZST=$(echo "$ZONE" | awk '{print $2}')
  if [ "$ZST" = "active" ]; then pass 4 "zone $ZID active"; else miss 4 "zone status: ${ZST:-none}"; fi

  # L5 routing rules
  RULES=""
  if [ -n "$ZID" ] && [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    RULES=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/zones/$ZID/email/routing/rules?per_page=50")
    echo "$RULES" > "$DEST/l5_rules.json"
    HIT=$(echo "$RULES" | python3 -c "
import sys,json
d = json.load(sys.stdin); addr = '''$ADDR'''.lower()
ok = False
for r in d.get('result', []):
    if not r.get('enabled'): continue
    for m in r.get('matchers', []):
        if m.get('type') == 'all': ok = True
        if m.get('type') == 'literal' and str(m.get('value','')).lower() == addr: ok = True
print('yes' if ok else 'no')")
    if [ "$HIT" = "yes" ]; then pass 5 "routing to worker covers $ADDR"; else miss 5 "no enabled rule/catch-all for $ADDR"; fi
  else
    miss 5 "no zone id or no CLOUDFLARE_API_TOKEN"
  fi

  # L6 worker live
  STATS=$(curl -s -m 15 https://cmail.tradesprior.workers.dev/api/stats)
  echo "$STATS" > "$DEST/l6_stats.json"
  if echo "$STATS" | grep -q "needs_me"; then pass 6 "worker live"; else miss 6 "worker unreachable"; fi

  # L7 mailbox indexed
  MBS=$(curl -s -X POST "$MCP" -H "Content-Type: application/json" \
    -d '{"tool":"email.list_mailboxes","args":{}}')
  echo "$MBS" > "$DEST/l7_mailboxes.json"
  if echo "$MBS" | grep -q "$ADDR"; then pass 7 "mailbox $ADDR indexed"; else miss 7 "mailbox $ADDR not in index"; fi

  echo "{\"domain\":\"$DOMAIN\",\"address\":\"$ADDR\",\"ts\":\"$TS\",\"pass\":$([ $fail -eq 0 ] && echo true || echo false)}" > "$DEST/verdict.json"
  say "evidence: $DEST"
  [ $fail -eq 0 ] && say "VERDICT: LAYERS 1-7 GREEN (round-trip still required for CERTIFIED)" || say "VERDICT: FAILED"
  exit $fail
fi

if [ "${1:-}" = "roundtrip" ]; then
  MB="${2:-}"; TOKEN="${3:-}"; TIMEOUT="${4:-600}"
  [ -z "$MB" ] || [ -z "$TOKEN" ] && { echo "usage: $0 roundtrip <mailbox> <token> [timeout_s]"; exit 2; }
  END=$(( $(date +%s) + TIMEOUT ))
  while [ "$(date +%s)" -lt "$END" ]; do
    FOUND=$(curl -s -X POST "$MCP" -H "Content-Type: application/json" \
      -d "{\"tool\":\"email.search\",\"args\":{\"q\":\"$TOKEN\"}}" | grep -o "$TOKEN" | head -n1)
    if [ -n "$FOUND" ]; then
      say "ROUND-TRIP PASS: token '$TOKEN' found in index (mailbox $MB)"
      exit 0
    fi
    sleep 20
  done
  say "ROUND-TRIP FAIL: token '$TOKEN' not seen in ${TIMEOUT}s"
  exit 1
fi

echo "usage: $0 {check <domain> <address> | roundtrip <mailbox> <token> [timeout_s]}"
exit 2
