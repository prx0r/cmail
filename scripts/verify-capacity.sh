#!/usr/bin/env bash
# verify-capacity.sh — Infrastructure proof generator
# Reads from DNS + Cloudflare API + cmail MCP → produces verdict JSON
# Usage: ./verify-capacity.sh <domain> [address]
# No sending. No external deps. Pure infrastructure verification.
set -euo pipefail

DOMAIN="${1:?usage: $0 <domain> [address]}"
ADDRESS="${2:-agents@$DOMAIN}"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TS_FILE=$(date -u +%Y%m%dT%H%M%SZ)

OUTDIR="receipts/capacity-proof/$DOMAIN/$TS_FILE"
mkdir -p "$OUTDIR"

MCP="https://cmail.tradesprior.workers.dev/mcp"
STATS_URL="https://cmail.tradesprior.workers.dev/api/stats"

# ─── Helpers ──────────────────────────────────────────────────
pass() { echo "✅ PASS $1"; }
fail() { echo "❌ FAIL $1"; }
warn() { echo "⚠️  WARN $1"; }

LAYER_RESULTS=()
LAYER_COUNT=0
PASS_COUNT=0

record() {
  local layer="$1" status="$2" detail="$3"
  LAYER_COUNT=$((LAYER_COUNT + 1))
  if [ "$status" = "PASS" ]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    pass "L$layer: $detail"
  else
    fail "L$layer: $detail"
  fi
  LAYER_RESULTS+=("{\"layer\":$layer,\"status\":\"$status\",\"detail\":\"$detail\"}")
}

echo "╔══════════════════════════════════════════════════════╗"
echo "║  CAPACITY PROOF: receive_email@$DOMAIN              ║"
echo "║  Address: $ADDRESS                                  ║"
echo "║  Time: $TS                                         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── L1: MX Records ──────────────────────────────────────────
echo "L1: MX Records"
MX_RAW=$(dig +short MX "$DOMAIN" 2>/dev/null || echo "")
echo "$MX_RAW" > "$OUTDIR/l1_mx.txt"
if echo "$MX_RAW" | grep -q "cloudflare"; then
  record 1 "PASS" "MX → $(echo "$MX_RAW" | head -1)"
else
  record 1 "FAIL" "no cloudflare MX for $DOMAIN"
fi

# ─── L2: SPF Record ──────────────────────────────────────────
echo "L2: SPF Record"
SPF_RAW=$(dig +short TXT "$DOMAIN" 2>/dev/null | grep -i "v=spf1" || echo "")
echo "$SPF_RAW" > "$OUTDIR/l2_spf.txt"
if [ -n "$SPF_RAW" ]; then
  record 2 "PASS" "SPF present"
else
  record 2 "FAIL" "no SPF TXT record"
fi

# ─── L3: DMARC Record ────────────────────────────────────────
echo "L3: DMARC Record"
DMARC_RAW=$(dig +short TXT "_dmarc.$DOMAIN" 2>/dev/null || echo "")
echo "${DMARC_RAW:-none}" > "$OUTDIR/l3_dmarc.txt"
if [ -n "$DMARC_RAW" ]; then
  record 3 "PASS" "DMARC present"
else
  record 3 "PASS" "DMARC missing (not blocking)"
fi

# ─── L4: Cloudflare Zone ─────────────────────────────────────
echo "L4: Cloudflare Zone"
CF_TOKEN=$(agent-vault vault credential get CLOUDFLARE_API_TOKEN --vault oracle 2>/dev/null | tail -1 || echo "")
if [ -n "$CF_TOKEN" ]; then
  ZONE_RESP=$(curl -sf -H "Authorization: Bearer $CF_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" 2>/dev/null || echo '{"result":[]}')
  ZONE_ID=$(echo "$ZONE_RESP" | python3 -c "import sys,json; r=json.load(sys.stdin).get('result',[]); print(r[0].get('id','') if r else '')" 2>/dev/null || echo "")
  ZONE_STATUS=$(echo "$ZONE_RESP" | python3 -c "import sys,json; r=json.load(sys.stdin).get('result',[]); print(r[0].get('status','') if r else '')" 2>/dev/null || echo "")
  echo "$ZONE_ID $ZONE_STATUS" > "$OUTDIR/l4_zone.txt"
  if [ "$ZONE_STATUS" = "active" ]; then
    record 4 "PASS" "zone $ZONE_ID active"
  else
    record 4 "FAIL" "zone status: ${ZONE_STATUS:-not found}"
  fi
else
  record 4 "FAIL" "no CF_API_TOKEN"
  ZONE_ID=""
fi

# ─── L5: Email Routing Rules ─────────────────────────────────
echo "L5: Email Routing Rules"
if [ -n "$ZONE_ID" ] && [ -n "$CF_TOKEN" ]; then
  RULES_RESP=$(curl -sf -H "Authorization: Bearer $CF_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/email/routing/rules?per_page=50" 2>/dev/null || echo '{"result":[]}')
  echo "$RULES_RESP" > "$OUTDIR/l5_routing.json"

  RULE_COUNT=$(echo "$RULES_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('result',[])))" 2>/dev/null || echo "0")
  CATCH_ALL=$(echo "$RULES_RESP" | python3 -c "
import sys, json
rules = json.load(sys.stdin).get('result', [])
found = any(m.get('type') == 'all' for r in rules for m in r.get('matchers', []))
print('yes' if found else 'no')
" 2>/dev/null || echo "no")

  if [ "$RULE_COUNT" -gt 0 ] && [ "$CATCH_ALL" = "yes" ]; then
    record 5 "PASS" "$RULE_COUNT rules, catch-all enabled"
  elif [ "$RULE_COUNT" -gt 0 ]; then
    record 5 "PASS" "$RULE_COUNT rules (no catch-all)"
  else
    record 5 "FAIL" "no routing rules"
  fi
else
  record 5 "FAIL" "no zone id or no CF token"
fi

# ─── L6: Worker Live ─────────────────────────────────────────
echo "L6: Worker Live"
STATS=$(curl -sf -m 10 "$STATS_URL" 2>/dev/null || echo "{}")
echo "$STATS" > "$OUTDIR/l6_stats.json"
if echo "$STATS" | grep -q "needs_me"; then
  TOTAL=$(echo "$STATS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo "?")
  record 6 "PASS" "worker live, $TOTAL messages indexed"
else
  record 6 "FAIL" "worker unreachable"
fi

# ─── L7: Mailbox Indexed ─────────────────────────────────────
echo "L7: Mailbox Indexed"
MBS=$(curl -sf -X POST "$MCP" -H "Content-Type: application/json" \
  -d '{"tool":"email.list_mailboxes"}' 2>/dev/null || echo '{"mailboxes":[]}')
echo "$MBS" > "$OUTDIR/l7_mailboxes.json"

MB_EXISTS=$(echo "$MBS" | python3 -c "
import sys, json
mbs = json.load(sys.stdin).get('mailboxes', [])
found = any('$ADDRESS' in m.get('id','') for m in mbs)
print('yes' if found else 'no')
" 2>/dev/null || echo "no")

if [ "$MB_EXISTS" = "yes" ]; then
  record 7 "PASS" "$ADDRESS indexed"
else
  record 7 "FAIL" "$ADDRESS not in mailbox index"
fi

# ─── Verdict ──────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
if [ "$PASS_COUNT" -eq "$LAYER_COUNT" ]; then
  VERDICT="CERTIFIED"
elif [ "$PASS_COUNT" -ge 5 ]; then
  VERDICT="DEGRADED"
else
  VERDICT="FAILED"
fi

echo "VERDICT: $VERDICT ($PASS_COUNT/$LAYER_COUNT layers green)"
echo "Evidence: $OUTDIR/"

# ─── Write Evidence Bundle ────────────────────────────────────
LAYERS_JSON=$(printf '%s\n' "${LAYER_RESULTS[@]}" | python3 -c "
import sys, json
lines = [json.loads(l) for l in sys.stdin]
print(json.dumps(lines, indent=2))
" 2>/dev/null || echo "[]")

cat > "$OUTDIR/verdict.json" << VERDICT_JSON
{
  "domain": "$DOMAIN",
  "address": "$ADDRESS",
  "timestamp": "$TS",
  "verdict": "$VERDICT",
  "pass_count": $PASS_COUNT,
  "total_layers": $LAYER_COUNT,
  "layers": $LAYERS_JSON,
  "evidence_dir": "$OUTDIR"
}
VERDICT_JSON

echo "Verdict written: $OUTDIR/verdict.json"
