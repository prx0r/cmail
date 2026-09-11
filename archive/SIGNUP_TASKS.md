# Signup Pipeline — A-Tasks, H-Tasks, M-Tasks

## A-Tasks (Agent — autonomous)

| ID | Task | Blocked By | Validation |
|----|------|------------|------------|
| A1 | Buy hamtask.com via Cloudflare | H1 ( creds) | `cf_check` returns registrable=true |
| A2 | Wire hamtask.com email to cmail | A1 | `cf_wire_email` returns zone_id |
| A3 | Provision Telnyx phone number | H2 (key) | `phone_search` returns numbers |
| A4 | Sign up GitHub (`hamtask`) | A2 (email) | `curl github.com/hamtask` returns 200 |
| A5 | Sign up npm (`hamtask`) | A2 (email) | `curl npmjs.com/hamtask` returns 200 |
| A6 | Sign up Bluesky (`hamtask`) | A2 (email) | `curl bsky.app/profile/hamtask` returns 200 |
| A7 | Sign up GitLab (`hamtask`) | A2 (email) | `curl gitlab.com/hamtask` returns 200 |
| A8 | Sign up SoundCloud (`hamtask`) | A2 (email) | `curl soundcloud.com/hamtask` returns 200 |
| A9 | Sign up Telegram (`hamtask`) | A3 (phone) | `curl t.me/hamtask` returns 200 |
| A10 | Sign up X (`hamtask`) | A2, A3 | `curl x.com/hamtask` returns 200 |
| A11 | Sign up YouTube (`hamtask`) | A2, A3 | Channel created |
| A12 | Sign up Pinterest (`hamtask`) | A2 (email) | `curl pinterest.com/hamtask` returns 200 |
| A13 | Sign up TikTok (`hamtask`) | A2, A3 | Account created |
| A14 | Sign up Snapchat (`hamtask`) | A2, A3 | Account created |
| A15 | Register `hamtaskofficial` on taken platforms | A4-A14 | All alternatives secured |

## H-Tasks (Human — needs action)

| ID | Task | Unlocks | Status |
|----|------|---------|--------|
| H1 | Set Cloudflare API token in vault | A1 (domain purchase) | ✅ done |
| H2 | Set Telnyx API key in vault | A3 (phone) | ⏸️ pending |
| H3 | Enable Namecheap API (20+ domains) | Alternative registrar | ⏸️ pending |
| H4 | Solve CAPTCHAs during signup (X, TikTok) | A10, A13 | ⏸️ pending |
| H5 | Confirm domain purchase ($10.46) | A1 | ⏸️ pending |

## M-Tasks (Money)

| ID | Task | Cost | Approval | Status |
|----|------|------|----------|--------|
| M1 | Buy hamtask.com via Cloudflare | $10.46 | H5 | ⏸️ pending |
| M2 | Buy hamtask.trade via Namecheap | $2.98 | H5 | ⏸️ pending |
| M3 | Telnyx phone number | ~$1/mo | — | ⏸️ pending |

## Predicted Data (for agent to keep moving)

While waiting for H2 (Telnyx key), the agent can:
1. ✅ Check domain availability (A1 preview)
2. ✅ Check all social handles (A4-A14 preview)
3. ✅ Generate signup credentials (email, password)
4. ⏸️ Cannot actually sign up without phone (X, YouTube, TikTok need SMS)

## Credentials Template

```
Username: hamtask
Email: hello@hamtask.com (after A2)
Password: [generated, stored in vault]
Phone: [Telnyx number after A3]
Display Name: HamTask
Bio: "Building tools for the future"
```
