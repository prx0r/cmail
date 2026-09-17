# Telnyx GB pricing — standing reference

Source: `https://telnyx.com/pricing.md` (canonical rate deck) fetched 2026-09-11
+ live `cost_information` from the available-numbers API (verified same day:
matches to the cent). All USD. Recheck at purchase — provider rules/prices move.

## Numbers (per DID)

| Type | Setup (one-time) | Monthly |
|------|-----------------|---------|
| Local 01/02 | $1 | $1 |
| National 03 | $1 | $1 |
| Mobile 07 | $2 | $2 |
| Toll-free 0800/0808 | $2 | $2 (+ usage below) |
| Shared-cost | $2.22 | $2.22 |

Porting: $30 per order change, $18 per rejection. Short codes: $750 setup +
$1,650/mo (irrelevant unless you're a bank).

## SMS (per part, 160 chars)

| Direction | Rate |
|-----------|------|
| Inbound (you receive, incl. OTPs) | **$0** |
| Outbound (you send, all UK operators flat) | **$0.055** |

Receiving verification codes costs nothing. Sending costs five-and-a-half
cents a part. MMS: $0.005 in / $0.015 out (don't).

## Voice inbound (per minute, you receive)

| Your number | Caller on landline | Caller on mobile |
|-------------|-------------------|------------------|
| Local 01/02 | $0.005 | $0.005 |
| National 03 | $0.005 | $0.005 |
| Mobile 07 | $0.0032 | $0.0032 |
| Toll-free 0800/0808 | $0.04 | $0.102 |

Toll-free inbound from mobiles is ~20x a normal call — the "free to caller"
cost lands on you. That's the economics line in the rubric.

## Voice outbound (per minute, you call out)

Destination-priced rate deck (not flat): **from $0.005/min** + **$0.002/min
Voice API platform fee** on top. UK-to-UK sits at the floor; international
varies by destination — pull the live quote for the specific country before
promising costs. Recording: +$0.002/min if enabled.

## AI voice agent path

- Telnyx Voice AI agents: **$0.05/min all-in** (SIP + STT + LLM + TTS).
- Our GPT-Live path (`docs/PHONE.md`): **$0.05/min** — same number, consistent.
- Rule of thumb: every agent-handled call minute ≈ $0.05 + inbound leg above.

## Worked example — the recommended 03 + 07 setup

| Item | Cost |
|------|------|
| 03 setup + 07 setup (one-time) | $1 + $2 = **$3** |
| Monthly rental (03 $1 + 07 $2) | **$3/mo** (~£2.40) |
| 100 inbound minutes on 03 | ~$0.50 |
| 100 agent-handled minutes | ~$5.00 |
| 50 outbound SMS parts | ~$2.75 |
| OTPs received | $0 |
| **Quiet month total** | **~$3–4/mo** |
| **Busy month (500 agent-minutes)** | **~$30/mo** |

## Agent notes

- Never quote from memory — this file is the quote source; refresh monthly
  (`curl -s https://telnyx.com/pricing.md` + diff GB sections).
- `name.phone_recommend` consumes live `cost_information` per candidate; this
  file is the human-readable backstop and pre-quote sheet.
- Economics scoring in the recommender degrades gracefully when cost fields
  are absent (defaults), so a missing `cost_information` never blocks a
  recommendation — it only weakens the price comparison.
